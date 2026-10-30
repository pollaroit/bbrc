import type { Database, Prisma } from "@bbrc/db";
import {
	compareSummaryLine,
	describeScoreBand,
	OVERLAP_WEIGHT,
	RATING_FULL_WEIGHT_AT,
	RATING_WEIGHT,
	scoreComparison,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	viewerIsAdmin as isAdminViewer,
	isBlockedFor,
	type MemberAccessFields,
	mayViewSection,
	memberAccessSelect,
	memberVisibleWhere,
} from "../user/member-access";
import { notBlockedWhere } from "../visibility/visibility-where";
import {
	compareBookSelect,
	loadMemberReads,
	type MemberReadRow,
	toCompareBook,
	toCompareReads,
} from "./user-compare.data";
import type {
	CompareBooksInput,
	CompareBooksOutput,
	CompareInput,
	CompareOutput,
	CompareSearchMembersInput,
	CompareSearchMembersOutput,
} from "./user-compare.schema";

export type CompareMemberRow = {
	id: string;
	username: string;
	name: string;
	image: string | null;
	status: "active" | "warned" | "banned" | string;
	allowCompare: boolean;
	createdAt: Date;
} & MemberAccessFields;

export type ComparePair = {
	viewer: Viewer;
	viewerId: string;
	viewerIsAdmin: boolean;
	viewerSide: "a" | "b" | null;
	a: CompareMemberRow;
	b: CompareMemberRow;
	/** "compare_off" when the other member switched comparisons off and the viewer is not an admin. */
	blocked: "compare_off" | "reads_private" | null;
};

const memberSelect = {
	username: true,
	name: true,
	image: true,
	status: true,
	allowCompare: true,
	createdAt: true,
	...memberAccessSelect,
} as const;

const notFound = (username: string) =>
	new ORPCError("NOT_FOUND", {
		message: `User with ${username} username not found. Please check the username and try again.`,
		data: { username },
	});

/** Applies the access rules in the schema header; every procedure starts here. */
export async function resolveComparePair(
	db: Database,
	viewer: Viewer,
	input: CompareInput,
): Promise<ComparePair> {
	if (viewer.kind !== "member") {
		throw new ORPCError("UNAUTHORIZED", {
			message: "You must be logged in to compare.",
		});
	}
	const viewerId = viewer.userId;
	const viewerIsAdmin = isAdminViewer(viewer);

	if (input.a.toLowerCase() === input.b.toLowerCase()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pick two different members to compare.",
			data: { code: "compare_same_user" },
		});
	}

	const members = await db.user.findMany({
		where: {
			OR: [
				{ username: { equals: input.a, mode: "insensitive" } },
				{ username: { equals: input.b, mode: "insensitive" } },
			],
		},
		select: memberSelect,
	});
	const find = (username: string) =>
		members.find((m) => m.username.toLowerCase() === username.toLowerCase());
	const a = find(input.a);
	const b = find(input.b);
	if (!a) throw notFound(input.a);
	if (!b) throw notFound(input.b);

	for (const member of [a, b]) {
		const own = member.id === viewerId;
		// Banned members, and members blocked either way, read as not found.
		if (
			!viewerIsAdmin &&
			!own &&
			(member.status === "banned" || isBlockedFor(viewer, member.id))
		) {
			throw notFound(member.username);
		}
	}

	const viewerSide = a.id === viewerId ? "a" : b.id === viewerId ? "b" : null;
	if (!viewerIsAdmin && viewerSide == null) {
		const viewer = await db.user.findUnique({
			where: { id: viewerId },
			select: { username: true },
		});
		throw new ORPCError("FORBIDDEN", {
			message: "You can only compare your own reading with another member.",
			data: {
				code: "compare_not_participant",
				redirectUsername: viewer?.username ?? null,
			},
		});
	}

	const other = viewerSide === "a" ? b : viewerSide === "b" ? a : null;
	// The other member must allow comparisons AND the viewer must be allowed to see their
	// reads (a private profile or a private reads setting keeps a stranger out).
	const blocked: ComparePair["blocked"] =
		!viewerIsAdmin && other != null && !other.allowCompare
			? "compare_off"
			: !viewerIsAdmin &&
					other != null &&
					!mayViewSection(viewer, other, "reads")
				? "reads_private"
				: null;

	return { viewer, viewerId, viewerIsAdmin, viewerSide, a, b, blocked };
}

const memberRef = (m: CompareMemberRow) => ({
	username: m.username,
	name: m.name,
	image: m.image,
});

// ── Header ─────────────────────────────────────────────────────────────────

async function loadMemberStats(
	db: Database,
	member: CompareMemberRow,
	reads: MemberReadRow[],
) {
	const year = new Date().getUTCFullYear();
	const bookIds = reads.map((read) => read.bookId);
	const rated = reads.filter((read) => read.rating != null);

	const [books, achievementsCount, links] = await Promise.all([
		bookIds.length === 0
			? Promise.resolve([] as { pages: number }[])
			: db.book.findMany({
					where: { id: { in: bookIds } },
					select: { pages: true },
				}),
		db.userAchievement.count({ where: { userId: member.id, revokedAt: null } }),
		bookIds.length === 0
			? Promise.resolve([])
			: db.bookAuthor.findMany({
					where: { bookId: { in: bookIds } },
					select: { author: { select: { id: true, slug: true, name: true } } },
				}),
	]);

	const authorCounts = new Map<
		string,
		{ slug: string; name: string; count: number }
	>();
	for (const link of links) {
		const entry = authorCounts.get(link.author.id) ?? {
			slug: link.author.slug,
			name: link.author.name,
			count: 0,
		};
		entry.count += 1;
		authorCounts.set(link.author.id, entry);
	}

	return {
		joinedAt: member.createdAt,
		booksRead: reads.length,
		averageRating:
			rated.length === 0
				? null
				: Math.round(
						(rated.reduce((sum, read) => sum + (read.rating ?? 0), 0) /
							rated.length) *
							100,
					) / 100,
		ratingsGiven: rated.length,
		pagesRead: books.reduce((sum, book) => sum + book.pages, 0),
		readsThisYear: reads.filter((read) => read.finish.year === year).length,
		achievementsCount,
		favoriteAuthors: [...authorCounts.values()]
			.sort((x, y) => y.count - x.count || x.name.localeCompare(y.name))
			.slice(0, 3),
	};
}

export function buildScoreOutput(score: ReturnType<typeof scoreComparison>) {
	return {
		overall: score.overall,
		overlap: score.overlap,
		ratingAgreement: score.ratingAgreement,
		sharedCount: score.sharedCount,
		onlyACount: score.onlyACount,
		onlyBCount: score.onlyBCount,
		coRatedCount: score.coRatedCount,
		confidence: score.confidence,
		band: describeScoreBand(score.overall),
		weights: {
			overlap: OVERLAP_WEIGHT,
			rating: RATING_WEIGHT,
			ratingFullWeightAt: RATING_FULL_WEIGHT_AT,
		},
	};
}

export async function compareMembers(
	input: CompareInput,
	db: Database,
	viewer: Viewer,
): Promise<CompareOutput> {
	const pair = await resolveComparePair(db, viewer, input);
	const base = {
		viewerIsAdmin: pair.viewerIsAdmin,
		viewerSide: pair.viewerSide,
	};

	if (pair.blocked) {
		return {
			...base,
			blocked: pair.blocked,
			a: { ...memberRef(pair.a), stats: null },
			b: { ...memberRef(pair.b), stats: null },
			score: null,
			summary: null,
		};
	}

	const reads = await loadMemberReads(db, [pair.a.id, pair.b.id]);
	const readsA = reads.get(pair.a.id) ?? [];
	const readsB = reads.get(pair.b.id) ?? [];
	const score = scoreComparison(toCompareReads(readsA), toCompareReads(readsB));
	const [statsA, statsB] = await Promise.all([
		loadMemberStats(db, pair.a, readsA),
		loadMemberStats(db, pair.b, readsB),
	]);

	return {
		...base,
		blocked: null,
		a: { ...memberRef(pair.a), stats: statsA },
		b: { ...memberRef(pair.b), stats: statsB },
		score: buildScoreOutput(score),
		summary: compareSummaryLine(score),
	};
}

// ── Book lists ─────────────────────────────────────────────────────────────

const finishKey = (
	finish: { year: number | null; month: number | null } | null,
) => (finish?.year == null ? 0 : finish.year * 12 + (finish.month ?? 0));

export async function listCompareBooks(
	input: CompareBooksInput,
	db: Database,
	viewer: Viewer,
): Promise<CompareBooksOutput> {
	const pair = await resolveComparePair(db, viewer, input);
	const empty = (blocked: ComparePair["blocked"]): CompareBooksOutput => ({
		blocked,
		items: [],
		metadata: { limit: input.limit, nextCursor: null, total: 0 },
	});
	if (pair.blocked) return empty(pair.blocked);

	const reads = await loadMemberReads(db, [pair.a.id, pair.b.id]);
	const rowsA = new Map((reads.get(pair.a.id) ?? []).map((r) => [r.bookId, r]));
	const rowsB = new Map((reads.get(pair.b.id) ?? []).map((r) => [r.bookId, r]));
	const score = scoreComparison(
		toCompareReads([...rowsA.values()]),
		toCompareReads([...rowsB.values()]),
	);
	const perBook = new Map(score.perBook.map((book) => [book.bookId, book]));

	const bookIds =
		input.group === "both"
			? [...rowsA.keys()].filter((id) => rowsB.has(id))
			: input.group === "onlyA"
				? [...rowsA.keys()].filter((id) => !rowsB.has(id))
				: [...rowsB.keys()].filter((id) => !rowsA.has(id));
	if (bookIds.length === 0) return empty(null);

	const search = input.search?.trim();
	const books = await db.book.findMany({
		where: {
			id: { in: bookIds },
			...(search
				? {
						OR: [
							{ title: { contains: search, mode: "insensitive" as const } },
							{ slug: { contains: search, mode: "insensitive" as const } },
							{ authors: { has: search } },
							{
								authorLinks: {
									some: {
										author: {
											OR: [
												{
													name: {
														contains: search,
														mode: "insensitive" as const,
													},
												},
												{
													slug: {
														contains: search,
														mode: "insensitive" as const,
													},
												},
											],
										},
									},
								},
							},
						],
					}
				: {}),
		},
		select: compareBookSelect,
	});

	const items = books.map((book) => {
		const rowA = rowsA.get(book.id) ?? null;
		const rowB = rowsB.get(book.id) ?? null;
		const per = perBook.get(book.id);
		return {
			book: toCompareBook(book),
			ratingA: rowA?.rating ?? null,
			ratingB: rowB?.rating ?? null,
			score: per?.score == null ? null : Math.round(per.score),
			diff: per?.diff ?? null,
			finishedA: rowA ? rowA.finish : null,
			finishedB: rowB ? rowB.finish : null,
		};
	});

	const dir = input.sortDirection === "asc" ? 1 : -1;
	items.sort((x, y) => {
		let cmp = 0;
		if (input.sort === "title") {
			cmp = x.book.title.localeCompare(y.book.title);
		} else if (input.sort === "date") {
			const kx = Math.max(finishKey(x.finishedA), finishKey(x.finishedB));
			const ky = Math.max(finishKey(y.finishedA), finishKey(y.finishedB));
			// Books without any finish date sort last in both directions.
			if (kx === 0 || ky === 0) {
				if (kx === ky) return x.book.title.localeCompare(y.book.title);
				return kx === 0 ? 1 : -1;
			}
			cmp = kx - ky;
		} else {
			// Books that were not rated by both sides sort last in both directions.
			if (x.score == null || y.score == null) {
				if (x.score == null && y.score == null) {
					return x.book.title.localeCompare(y.book.title);
				}
				return x.score == null ? 1 : -1;
			}
			cmp = x.score - y.score;
		}
		return cmp === 0 ? x.book.title.localeCompare(y.book.title) : cmp * dir;
	});

	const start = input.cursor ?? 0;
	const page = items.slice(start, start + input.limit);
	const next = start + input.limit;
	return {
		blocked: null,
		items: page,
		metadata: {
			limit: input.limit,
			nextCursor: next < items.length ? next : null,
			total: items.length,
		},
	};
}

// ── Member picker ──────────────────────────────────────────────────────────

export async function searchCompareMembers(
	input: CompareSearchMembersInput,
	db: Database,
	viewer: Viewer,
): Promise<CompareSearchMembersOutput> {
	const isAdmin = isAdminViewer(viewer);
	const query = input.query.trim();
	const users = await db.user.findMany({
		where: {
			// Only members the viewer could actually compare with: not blocked, and reads they may see.
			AND: [
				notBlockedWhere(viewer) as Prisma.UserWhereInput,
				memberVisibleWhere(viewer, { section: "reads" }),
			],
			...(isAdmin ? {} : { status: { not: "banned" }, allowCompare: true }),
			...(input.excludeUsername
				? { username: { not: input.excludeUsername, mode: "insensitive" } }
				: {}),
			...(query
				? {
						OR: [
							{ name: { contains: query, mode: "insensitive" } },
							{ username: { contains: query, mode: "insensitive" } },
						],
					}
				: {}),
		},
		orderBy: [{ reads: { _count: "desc" } }, { name: "asc" }],
		take: input.limit,
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			allowCompare: true,
			_count: { select: { reads: true } },
		},
	});

	return {
		items: users.map((user) => ({
			username: user.username,
			name: user.name,
			image: user.image,
			booksRead: user._count.reads,
			compareOff: !user.allowCompare,
			isMe: viewer.kind === "member" && user.id === viewer.userId,
		})),
	};
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getComparePreferences(db: Database, userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowCompare: true },
	});
	return { allowCompare: user?.allowCompare ?? true };
}

export async function setComparePreferences(
	db: Database,
	userId: string,
	input: { allowCompare: boolean },
) {
	const user = await db.user.update({
		where: { id: userId },
		data: { allowCompare: input.allowCompare },
		select: { allowCompare: true },
	});
	return { allowCompare: user.allowCompare };
}
