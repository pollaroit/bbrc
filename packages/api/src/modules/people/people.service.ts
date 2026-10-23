import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import {
	computeReadingStreak,
	contentPlainText,
	genres,
	type LevelTier,
	RP_LEVEL_TIERS,
	XP_LEVEL_TIERS,
} from "@bbrc/shared";
import { userMemberLevelsFromPoints } from "../user/member-levels";
import {
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	GetPeopleListInput,
	GetPeopleListOutput,
	GetPeopleOverviewOutput,
	PeopleListItem,
} from "./people.schema";

const BIO_PREVIEW_CHARS = 140;
const MAX_CARD_GENRES = 3;
const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const genreNameBySlug = new Map<string, string>(
	genres.map((genre) => [genre.slug, genre.name]),
);

const userListSelect = {
	id: true,
	username: true,
	name: true,
	image: true,
	status: true,
	isAdmin: true,
	createdAt: true,
	xp: true,
	rp: true,
	profile: {
		select: { bio: true, location: true, favoriteGenres: true },
	},
	_count: {
		select: {
			reads: true,
			feedbacks: true,
			posts: true,
			favorites: true,
			shelves: { where: { status: "active" } },
			quizSubmissions: { where: { status: "submitted" } },
			documents: { where: { status: "approved" } },
			participations: { where: { removedAt: null } },
		},
	},
} satisfies Prisma.UserSelect;

type PeopleRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

function levelRanges(
	labels: readonly string[] | undefined,
	tiers: LevelTier[],
	field: "xp" | "rp",
): Prisma.UserWhereInput | null {
	if (!labels?.length) {
		return null;
	}
	const ranges = tiers
		.filter((tier) => labels.includes(tier.label))
		.map((tier) => ({
			[field]: {
				gte: tier.minInclusive,
				...(tier.maxExclusive != null ? { lt: tier.maxExclusive } : {}),
			},
		}));
	return ranges.length > 0 ? { OR: ranges } : { id: { in: [] } };
}

async function userIdsWithAtLeast(
	kind: "reads" | "reviews" | "sittings" | "joined",
	count: number,
	db: Database,
): Promise<string[]> {
	if (kind === "reads") {
		const rows = await db.read.groupBy({
			by: ["userId"],
			having: { userId: { _count: { gte: count } } },
		});
		return rows.map((row) => row.userId);
	}
	if (kind === "reviews") {
		const rows = await db.feedback.groupBy({
			by: ["authorId"],
			having: { authorId: { _count: { gte: count } } },
		});
		return rows.map((row) => row.authorId);
	}
	const rows = await db.participation.groupBy({
		by: ["userId"],
		where:
			kind === "joined"
				? { removedAt: null }
				: { removedAt: null, progress: "completed" },
		having: { userId: { _count: { gte: count } } },
	});
	return rows.map((row) => row.userId);
}

async function buildWhere(
	input: GetPeopleListInput,
	db: Database,
	isAdmin: boolean,
): Promise<Prisma.UserWhereInput> {
	const and: Prisma.UserWhereInput[] = [visibleOnSiteUserWhere];

	// Banned members are only ever listed for administrators who ask for them.
	and.push(
		isAdmin && input.statuses?.length
			? { status: { in: input.statuses } }
			: isAdmin
				? {}
				: { status: { not: "banned" } },
	);

	if (input.isAdmin !== undefined) {
		and.push({ isAdmin: input.isAdmin });
	}
	if (input.search) {
		and.push({
			OR: [
				{ name: { contains: input.search, mode: "insensitive" } },
				{ username: { contains: input.search, mode: "insensitive" } },
			],
		});
	}
	if (input.rangeMin || input.rangeMax) {
		and.push({
			createdAt: {
				...(input.rangeMin ? { gte: input.rangeMin } : {}),
				...(input.rangeMax ? { lte: input.rangeMax } : {}),
			},
		});
	}

	const xp = levelRanges(input.xpLevels, XP_LEVEL_TIERS, "xp");
	const rp = levelRanges(input.rpLevels, RP_LEVEL_TIERS, "rp");
	if (xp) and.push(xp);
	if (rp) and.push(rp);

	if (input.genres?.length) {
		and.push({ profile: { favoriteGenres: { hasSome: input.genres } } });
	}
	if (input.location) {
		and.push({
			profile: { location: { contains: input.location, mode: "insensitive" } },
		});
	}
	for (const slug of input.readBooks ?? []) {
		and.push({ reads: { some: { book: { slug } } } });
	}

	if (input.readingNow) {
		and.push({
			participations: {
				some: {
					removedAt: null,
					progress: { in: ["not_started", "in_progress"] },
					sitting: { status: "reading" },
				},
			},
		});
	}
	if (input.hasReviews) and.push({ feedbacks: { some: {} } });
	if (input.hasPosts) and.push({ posts: { some: {} } });
	if (input.hasShelves) and.push({ shelves: { some: { status: "active" } } });
	if (input.hasFavorites) and.push({ favorites: { some: {} } });
	if (input.tookQuiz) {
		and.push({ quizSubmissions: { some: { status: "submitted" } } });
	}
	if (input.hasGoal) {
		and.push({ goals: { some: { year: new Date().getFullYear() } } });
	}
	if (input.contributedDocuments) {
		and.push({ documents: { some: { status: "approved" } } });
	}
	if (input.hasBio) and.push({ profile: { bio: { not: null } } });
	if (input.hasAvatar) and.push({ image: { not: null } });

	const thresholds = [
		["reads", input.minReads],
		["reviews", input.minReviews],
		["sittings", input.minSittings],
		["joined", input.minJoined],
	] as const;
	for (const [kind, count] of thresholds) {
		if (count != null) {
			and.push({ id: { in: await userIdsWithAtLeast(kind, count, db) } });
		}
	}

	return { AND: and };
}

function orderByFor(
	sortBy: Exclude<GetPeopleListInput["sortBy"], ComputedSort>,
	direction: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput {
	switch (sortBy) {
		case "reads":
			return { reads: { _count: direction } };
		case "feedbacks":
			return { feedbacks: { _count: direction } };
		case "posts":
			return { posts: { _count: direction } };
		case "participations":
			return { participations: { _count: direction } };
		case "shelves":
			return { shelves: { _count: direction } };
		case "favorites":
			return { favorites: { _count: direction } };
		case "quizzes":
			return { quizSubmissions: { _count: direction } };
		case "documents":
			return { documents: { _count: direction } };
		default:
			return { [sortBy]: direction };
	}
}

const COMPUTED_SORTS = ["streak", "averageRating", "authors"] as const;
type ComputedSort = (typeof COMPUTED_SORTS)[number];

function isComputedSort(
	sortBy: GetPeopleListInput["sortBy"],
): sortBy is ComputedSort {
	return (COMPUTED_SORTS as readonly string[]).includes(sortBy);
}

async function loadAverageRatings(
	userIds: string[],
	db: Database,
): Promise<Map<string, number>> {
	const rows = await db.feedback.groupBy({
		by: ["authorId"],
		where: { authorId: { in: userIds } },
		_avg: { rating: true },
	});
	return new Map(
		rows.flatMap((row) =>
			row._avg.rating == null ? [] : [[row.authorId, row._avg.rating] as const],
		),
	);
}

async function loadDistinctAuthorCounts(
	userIds: string[],
	db: Database,
): Promise<Map<string, number>> {
	const rows = await db.read.findMany({
		where: { userId: { in: userIds } },
		select: { userId: true, book: { select: { authors: true } } },
	});
	const byUser = new Map<string, Set<string>>();
	for (const row of rows) {
		const set = byUser.get(row.userId) ?? new Set<string>();
		for (const author of row.book.authors) {
			set.add(author);
		}
		byUser.set(row.userId, set);
	}
	return new Map([...byUser].map(([id, set]) => [id, set.size]));
}

type Streak = { current: number; best: number; finished: number };

async function loadStreaks(
	userIds: string[],
	db: Database,
): Promise<Map<string, Streak>> {
	const result = new Map<string, Streak>();
	if (userIds.length === 0) {
		return result;
	}
	const rows = await db.participation.findMany({
		where: {
			userId: { in: userIds },
			removedAt: null,
			sitting: { status: "finished" },
		},
		select: {
			userId: true,
			progress: true,
			sitting: { select: { slug: true, deadline: true } },
		},
	});

	const byUser = new Map<string, typeof rows>();
	for (const row of rows) {
		const list = byUser.get(row.userId) ?? [];
		list.push(row);
		byUser.set(row.userId, list);
	}
	for (const id of userIds) {
		const list = byUser.get(id) ?? [];
		const streak = computeReadingStreak(
			list.map((row) => ({
				progress: row.progress,
				sittingSlug: row.sitting.slug,
				finishedAtMs: row.sitting.deadline.getTime(),
			})),
		);
		result.set(id, {
			current: streak.current,
			best: streak.best,
			finished: list.filter((row) => row.progress === "completed").length,
		});
	}
	return result;
}

async function buildItems(
	rows: PeopleRow[],
	db: Database,
): Promise<PeopleListItem[]> {
	const ids = rows.map((row) => row.id);
	const [streaks, ratings, reading, authorCounts] = await Promise.all([
		loadStreaks(ids, db),
		db.feedback.groupBy({
			by: ["authorId"],
			where: { authorId: { in: ids } },
			_avg: { rating: true },
		}),
		db.participation.findMany({
			where: {
				userId: { in: ids },
				removedAt: null,
				progress: { in: ["not_started", "in_progress"] },
				sitting: { status: "reading" },
			},
			select: {
				userId: true,
				progress: true,
				sitting: { select: { slug: true } },
			},
		}),
		loadDistinctAuthorCounts(ids, db),
	]);
	const ratingByUser = new Map(
		ratings.map((row) => [row.authorId, row._avg.rating]),
	);
	const readingByUser = new Map(reading.map((row) => [row.userId, row]));

	return rows.map((row) => {
		const levels = userMemberLevelsFromPoints(row.xp, row.rp);
		const streak = streaks.get(row.id);
		const average = ratingByUser.get(row.id);
		const now = readingByUser.get(row.id);
		const bio = row.profile?.bio
			? contentPlainText(row.profile.bio).trim().slice(0, BIO_PREVIEW_CHARS)
			: "";

		return {
			id: row.id,
			username: row.username,
			name: row.name,
			image: row.image,
			status: row.status,
			isAdmin: row.isAdmin,
			createdAt: row.createdAt.toISOString(),
			xp: row.xp,
			rp: row.rp,
			xpLevel: levels.xpLevel,
			rpLevel: levels.rpLevel,
			bio: bio || null,
			location: row.profile?.location ?? null,
			favoriteGenres: (row.profile?.favoriteGenres ?? [])
				.map((slug) => genreNameBySlug.get(slug))
				.filter((name): name is string => name != null)
				.slice(0, MAX_CARD_GENRES),
			reads: row._count.reads,
			reviews: row._count.feedbacks,
			posts: row._count.posts,
			sittingsFinished: streak?.finished ?? 0,
			sittingsJoined: row._count.participations,
			shelves: row._count.shelves,
			favorites: row._count.favorites,
			quizzesTaken: row._count.quizSubmissions,
			documentsShared: row._count.documents,
			authorsRead: authorCounts.get(row.id) ?? 0,
			streak: { current: streak?.current ?? 0, best: streak?.best ?? 0 },
			averageRatingGiven:
				average != null ? Math.round(average * 100) / 100 : null,
			readingNow: now
				? { sittingSlug: now.sitting.slug, progress: now.progress }
				: null,
		};
	});
}

export async function getPeopleList(
	input: GetPeopleListInput,
	db: Database,
	session: Session | null,
): Promise<GetPeopleListOutput> {
	const isAdmin = viewerFromSession(session)?.isAdmin === true;
	const where = await buildWhere(input, db, isAdmin);
	const direction = input.sortDirection;
	const total = await db.user.count({ where });

	// Streaks are computed, not stored, so these requests sort and page in memory.
	if (isComputedSort(input.sortBy) || input.hasStreak) {
		const candidates = await db.user.findMany({
			where,
			select: { id: true, username: true },
		});
		const streaks = await loadStreaks(
			candidates.map((candidate) => candidate.id),
			db,
		);
		const ids = candidates.map((candidate) => candidate.id);
		const ratings =
			input.sortBy === "averageRating"
				? await loadAverageRatings(ids, db)
				: new Map<string, number>();
		const authors =
			input.sortBy === "authors"
				? await loadDistinctAuthorCounts(ids, db)
				: new Map<string, number>();
		const sign = direction === "asc" ? 1 : -1;

		/** Members without a value always sort last. */
		const compareNullable = (a: number | undefined, b: number | undefined) => {
			if (a == null && b == null) return 0;
			if (a == null) return 1;
			if (b == null) return -1;
			return (a - b) * sign;
		};

		const ranked = candidates
			.filter(
				(candidate) =>
					!input.hasStreak || (streaks.get(candidate.id)?.current ?? 0) > 0,
			)
			.sort((a, b) => {
				const left = streaks.get(a.id);
				const right = streaks.get(b.id);
				let primary = 0;
				if (input.sortBy === "streak") {
					primary =
						((left?.current ?? 0) - (right?.current ?? 0)) * sign ||
						((left?.best ?? 0) - (right?.best ?? 0)) * sign;
				} else if (input.sortBy === "averageRating") {
					primary = compareNullable(ratings.get(a.id), ratings.get(b.id));
				} else if (input.sortBy === "authors") {
					primary = compareNullable(
						authors.get(a.id) ?? 0,
						authors.get(b.id) ?? 0,
					);
				}
				return primary || a.username.localeCompare(b.username);
			});

		const offset = input.cursor ? Number.parseInt(input.cursor, 10) || 0 : 0;
		const pageIds = ranked
			.slice(offset, offset + input.limit)
			.map((candidate) => candidate.id);
		const rows = await db.user.findMany({
			where: { id: { in: pageIds } },
			select: userListSelect,
		});
		const order = new Map(pageIds.map((id, index) => [id, index]));
		rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
		const hasNextPage = offset + input.limit < ranked.length;

		return {
			items: await buildItems(rows, db),
			metadata: {
				limit: input.limit,
				hasNextPage,
				hasPreviousPage: offset > 0,
				nextCursor: hasNextPage ? String(offset + input.limit) : null,
			},
			total: ranked.length,
		};
	}

	const rows = await db.user.findMany({
		where,
		orderBy: [
			orderByFor(
				input.sortBy as Exclude<typeof input.sortBy, "streak">,
				direction,
			),
			{ username: direction },
		],
		take: input.limit + 1,
		...(input.cursor ? { cursor: { username: input.cursor }, skip: 1 } : {}),
		select: userListSelect,
	});

	const hasNextPage = rows.length > input.limit;
	const pageRows = hasNextPage ? rows.slice(0, input.limit) : rows;

	return {
		items: await buildItems(pageRows, db),
		metadata: {
			limit: input.limit,
			hasNextPage,
			hasPreviousPage: input.cursor !== undefined,
			nextCursor: hasNextPage ? (pageRows.at(-1)?.username ?? null) : null,
		},
		total,
	};
}

export async function getPeopleOverview(
	db: Database,
): Promise<GetPeopleOverviewOutput> {
	const where: Prisma.UserWhereInput = {
		...visibleOnSiteUserWhere,
		status: { not: "banned" },
	};
	const since = new Date(Date.now() - ACTIVE_WINDOW_MS);

	const [total, activeLast30Days, newest] = await Promise.all([
		db.user.count({ where }),
		db.user.count({
			where: { ...where, xpEvents: { some: { createdAt: { gte: since } } } },
		}),
		db.user.findFirst({
			where,
			orderBy: { createdAt: "desc" },
			select: { name: true, username: true, createdAt: true },
		}),
	]);

	return {
		total,
		activeLast30Days,
		newest: newest
			? {
					name: newest.name,
					username: newest.username,
					createdAt: newest.createdAt.toISOString(),
				}
			: null,
	};
}
