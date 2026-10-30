import type { Database, Prisma } from "@bbrc/db";
import { richContentPreview, type Viewer } from "@bbrc/shared";
import { mergeWhereFragments } from "../../utils/searching";
import { userFeedbackReviewTypeWhere } from "../feedback/user-feedback.listing";
import {
	loadEditionSnapshotLabels,
	readEditionRef,
	readEditionRefSelect,
} from "../read/read-edition-ref";
import {
	readVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import type {
	AuthorBookOptionsOutput,
	AuthorMemberOptionsOutput,
	AuthorReadsInput,
	AuthorReadsOutput,
	AuthorReviewsInput,
	AuthorReviewsOutput,
	AuthorSeriesOptionsOutput,
} from "./author.schema";
import {
	bookSearchWhere,
	buildScopedBookWhere,
	byAuthor,
	dayRangeWhere,
	memberSearchWhere,
	readEndRangeWhere,
	readFinishedOrderBy,
	scopedMemberWhere,
} from "./author-activity";
import { bookRef, offsetMetadata, parseOffsetCursor } from "./author-data";
import { actorOf, resolveAuthor } from "./author-resolve";

const OPTIONS_LIMIT = 20;

const userRef = {
	select: { username: true, name: true, image: true },
} as const;

const bookSelect = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	seriesMembership: {
		select: {
			position: true,
			series: { select: { slug: true, title: true } },
		},
	},
} as const;

function seriesOf(book: {
	seriesMembership: {
		position: number;
		series: { slug: string; title: string };
	} | null;
}) {
	return book.seriesMembership
		? {
				slug: book.seriesMembership.series.slug,
				title: book.seriesMembership.series.title,
				position: book.seriesMembership.position,
			}
		: null;
}

const emptyPage = (limit: number) => ({
	items: [],
	metadata: offsetMetadata({
		limit,
		skip: 0,
		shown: 0,
		hasNextPage: false,
		total: 0,
	}),
});

// ── Reads ──────────────────────────────────────────────────────────────────

export function readOrderBy(
	sortBy: AuthorReadsInput["sortBy"],
	direction: "asc" | "desc",
): Prisma.ReadOrderByWithRelationInput[] {
	const tail: Prisma.ReadOrderByWithRelationInput[] = [
		{ createdAt: "desc" },
		{ userId: "asc" },
		{ bookId: "asc" },
	];
	switch (sortBy) {
		case "loggedAt":
			return [{ createdAt: direction }, { userId: "asc" }, { bookId: "asc" }];
		case "book":
			return [
				{ book: { title: direction } },
				...readFinishedOrderBy("desc"),
				...tail,
			];
		case "member":
			return [
				{ user: { name: direction } },
				...readFinishedOrderBy("desc"),
				...tail,
			];
		default:
			return [...readFinishedOrderBy(direction), ...tail];
	}
}

export async function getAuthorReads(
	input: AuthorReadsInput,
	db: Database,
	viewer: Viewer,
): Promise<AuthorReadsOutput> {
	const actor = actorOf(viewer);
	const author = await resolveAuthor(db, input.slug, viewer);

	const bookWhere = await buildScopedBookWhere(
		db,
		author.id,
		input,
		actor?.userId,
	);
	if (bookWhere == null) return emptyPage(input.limit);

	const search = input.search?.trim();
	const whereAll = mergeWhereFragments<Prisma.ReadWhereInput>(
		{ book: bookWhere },
		{ user: scopedMemberWhere(input.members) },
		readEndRangeWhere(input.finishedFrom, input.finishedTo) ?? {},
		(() => {
			const logged = dayRangeWhere(input.loggedFrom, input.loggedTo);
			return logged ? { createdAt: logged } : {};
		})(),
		search
			? {
					OR: [
						{ user: memberSearchWhere(search) },
						{ book: bookSearchWhere(search) },
					],
				}
			: {},
	);
	// Named rows follow each member's privacy; the everyone-count says how many are hidden.
	const where: Prisma.ReadWhereInput = {
		AND: [whereAll, readVisibleWhere(viewer) as Prisma.ReadWhereInput],
	};
	const skip = parseOffsetCursor(input.cursor);

	const [total, totalAll, rows] = await Promise.all([
		skip === 0 ? db.read.count({ where }) : Promise.resolve(undefined),
		skip === 0
			? db.read.count({ where: whereAll })
			: Promise.resolve(undefined),
		db.read.findMany({
			where,
			skip,
			take: input.limit + 1,
			orderBy: readOrderBy(input.sortBy, input.sortDirection),
			select: {
				createdAt: true,
				readEndMonth: true,
				readEndYear: true,
				user: userRef,
				book: { select: bookSelect },
				...readEditionRefSelect,
			},
		}),
	]);

	const hasNextPage = rows.length > input.limit;
	const page = hasNextPage ? rows.slice(0, input.limit) : rows;
	const labels = await loadEditionSnapshotLabels(
		db,
		page.flatMap((row) => (row.editionId ? [row.editionId] : [])),
	);

	return {
		items: page.map((row) => ({
			member: row.user,
			book: bookRef(row.book),
			series: seriesOf(row.book),
			finishedMonth: row.readEndMonth,
			finishedYear: row.readEndYear,
			edition: readEditionRef(row, labels),
			createdAt: row.createdAt,
		})),
		metadata: {
			...offsetMetadata({
				limit: input.limit,
				skip,
				shown: page.length,
				hasNextPage,
				total,
			}),
			...(total != null && totalAll != null
				? { privateCount: Math.max(0, totalAll - total) }
				: {}),
		},
	};
}

// ── Reviews ────────────────────────────────────────────────────────────────

export function reviewOrderBy(
	sortBy: AuthorReviewsInput["sortBy"],
	direction: "asc" | "desc",
): Prisma.FeedbackOrderByWithRelationInput[] {
	const tail: Prisma.FeedbackOrderByWithRelationInput[] = [
		{ createdAt: "desc" },
		{ slug: "desc" },
	];
	switch (sortBy) {
		case "rating":
			return [{ rating: direction }, ...tail];
		case "likes":
			return [{ likes: { _count: direction } }, ...tail];
		case "comments":
			return [{ comments: { _count: direction } }, ...tail];
		case "book":
			return [{ book: { title: direction } }, ...tail];
		default:
			return [{ createdAt: direction }, { slug: direction }];
	}
}

export async function getAuthorReviews(
	input: AuthorReviewsInput,
	db: Database,
	viewer: Viewer,
): Promise<AuthorReviewsOutput> {
	const actor = actorOf(viewer);
	const author = await resolveAuthor(db, input.slug, viewer);

	const bookWhere = await buildScopedBookWhere(
		db,
		author.id,
		input,
		actor?.userId,
	);
	if (bookWhere == null) return emptyPage(input.limit);

	const search = input.search?.trim();
	const created = dayRangeWhere(input.createdFrom, input.createdTo);
	const whereAll = mergeWhereFragments<Prisma.FeedbackWhereInput>(
		{ book: bookWhere },
		{ author: scopedMemberWhere(input.members) },
		input.minRating != null || input.maxRating != null
			? { rating: { gte: input.minRating, lte: input.maxRating } }
			: {},
		userFeedbackReviewTypeWhere(input.reviewType),
		input.hasImage != null
			? input.hasImage
				? { imageUrl: { not: null } }
				: { imageUrl: null }
			: {},
		input.spoilers === "only"
			? { isSpoiler: true }
			: input.spoilers === "hide"
				? { isSpoiler: false }
				: {},
		created ? { createdAt: created } : {},
		search
			? {
					OR: [
						{ author: memberSearchWhere(search) },
						{ book: bookSearchWhere(search) },
						// The text of a spoiler review is never matched, so a search cannot reveal it.
						{
							isSpoiler: false,
							review: { contains: search, mode: "insensitive" },
						},
					],
				}
			: {},
	);
	const where: Prisma.FeedbackWhereInput = {
		AND: [whereAll, reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
	};
	const skip = parseOffsetCursor(input.cursor);

	const [total, totalAll, rows] = await Promise.all([
		skip === 0 ? db.feedback.count({ where }) : Promise.resolve(undefined),
		skip === 0
			? db.feedback.count({ where: whereAll })
			: Promise.resolve(undefined),
		db.feedback.findMany({
			where,
			skip,
			take: input.limit + 1,
			orderBy: reviewOrderBy(input.sortBy, input.sortDirection),
			select: {
				slug: true,
				rating: true,
				review: true,
				isSpoiler: true,
				imageUrl: true,
				createdAt: true,
				author: userRef,
				book: { select: bookSelect },
				_count: { select: { likes: true, comments: true } },
			},
		}),
	]);

	const hasNextPage = rows.length > input.limit;
	const page = hasNextPage ? rows.slice(0, input.limit) : rows;

	return {
		items: page.map((row) => {
			const excerpt = row.isSpoiler ? "" : richContentPreview(row.review, 280);
			return {
				slug: row.slug,
				member: row.author,
				book: bookRef(row.book),
				series: seriesOf(row.book),
				rating: row.rating,
				isSpoiler: row.isSpoiler,
				excerpt: excerpt.trim() ? excerpt : null,
				hasImage: row.imageUrl != null,
				likeCount: row._count.likes,
				commentCount: row._count.comments,
				createdAt: row.createdAt,
			};
		}),
		metadata: {
			...offsetMetadata({
				limit: input.limit,
				skip,
				shown: page.length,
				hasNextPage,
				total,
			}),
			...(total != null && totalAll != null
				? { privateCount: Math.max(0, totalAll - total) }
				: {}),
		},
	};
}

// ── Option lists ───────────────────────────────────────────────────────────

/** Members who read (or reviewed) the author's books, most active first. */
export async function listAuthorMemberOptions(
	input: { slug: string; query: string; source: "reads" | "reviews" },
	db: Database,
	viewer: Viewer,
): Promise<AuthorMemberOptionsOutput> {
	const author = await resolveAuthor(db, input.slug, viewer);
	const query = input.query.trim();
	const memberFilter: Prisma.UserWhereInput = query
		? memberSearchWhere(query)
		: {};

	const groups =
		input.source === "reads"
			? (
					await db.read.groupBy({
						by: ["userId"],
						where: {
							book: byAuthor(author.id),
							user: memberFilter,
							AND: [readVisibleWhere(viewer) as Prisma.ReadWhereInput],
						},
						_count: { _all: true },
						orderBy: [{ _count: { userId: "desc" } }, { userId: "asc" }],
						take: OPTIONS_LIMIT,
					})
				).map((row) => ({ userId: row.userId, count: row._count._all }))
			: (
					await db.feedback.groupBy({
						by: ["authorId"],
						where: {
							book: byAuthor(author.id),
							author: memberFilter,
							AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
						},
						_count: { _all: true },
						orderBy: [{ _count: { authorId: "desc" } }, { authorId: "asc" }],
						take: OPTIONS_LIMIT,
					})
				).map((row) => ({ userId: row.authorId, count: row._count._all }));

	const users = await db.user.findMany({
		where: { id: { in: groups.map((group) => group.userId) } },
		select: { id: true, username: true, name: true, image: true },
	});
	const byId = new Map(users.map((user) => [user.id, user]));

	return {
		items: groups.flatMap((group) => {
			const user = byId.get(group.userId);
			return user
				? [
						{
							username: user.username,
							name: user.name,
							image: user.image,
							count: group.count,
						},
					]
				: [];
		}),
	};
}

export async function listAuthorBookOptions(
	input: { slug: string; query: string },
	db: Database,
	viewer: Viewer,
): Promise<AuthorBookOptionsOutput> {
	const author = await resolveAuthor(db, input.slug, viewer);
	const query = input.query.trim();
	const rows = await db.book.findMany({
		where: mergeWhereFragments<Prisma.BookWhereInput>(
			byAuthor(author.id),
			query
				? {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ slug: { contains: query, mode: "insensitive" } },
						],
					}
				: {},
		),
		orderBy: [{ title: "asc" }, { slug: "asc" }],
		take: OPTIONS_LIMIT,
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			publishedIn: true,
		},
	});
	return {
		items: rows.map((row) => ({
			...bookRef(row),
			publishedIn: row.publishedIn,
		})),
	};
}

/** Series that hold at least one of the author's books. */
export async function listAuthorSeriesOptions(
	input: { slug: string; query: string },
	db: Database,
	viewer: Viewer,
): Promise<AuthorSeriesOptionsOutput> {
	const author = await resolveAuthor(db, input.slug, viewer);
	const query = input.query.trim();
	const rows = await db.series.findMany({
		where: mergeWhereFragments<Prisma.SeriesWhereInput>(
			{ books: { some: { book: byAuthor(author.id) } } },
			query
				? {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ slug: { contains: query, mode: "insensitive" } },
						],
					}
				: {},
		),
		orderBy: [{ title: "asc" }, { slug: "asc" }],
		take: OPTIONS_LIMIT,
		select: {
			slug: true,
			title: true,
			_count: { select: { books: { where: { book: byAuthor(author.id) } } } },
		},
	});
	return {
		items: rows.map((row) => ({
			slug: row.slug,
			title: row.title,
			authorBookCount: row._count.books,
		})),
	};
}
