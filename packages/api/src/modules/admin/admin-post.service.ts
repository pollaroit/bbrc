import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type AdminPostListFilters,
	adminPostListRanging,
	adminPostListSearching,
	adminPostListSorting,
	postAttachedBookWhere,
	type postAttachmentKindValues,
} from "./admin-post.listing";
import type {
	AdminPostOverviewOutput,
	GetAdminPostOverviewInput,
	GetAdminPostStatsInput,
	GetAdminPostStatsOutput,
	ListAdminPostsInput,
	ListAdminPostsOutput,
} from "./admin-post.schema";
import { adminPostListSelect } from "./admin-post.schema";
import {
	emptyAdminPostRankings,
	loadAdminPostRankings,
} from "./admin-post-rankings";

type AdminPostListQueryInput =
	| GetAdminPostOverviewInput
	| ListAdminPostsInput
	| GetAdminPostStatsInput;

function buildAdditionsByDay(
	rows: { createdAt: Date }[],
	days: number,
): { date: string; count: number }[] {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);

	const countsByDay = new Map<string, number>();
	for (let i = 0; i < days; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		countsByDay.set(day.toISOString().slice(0, 10), 0);
	}

	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (countsByDay.has(key)) {
			countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
		}
	}

	return [...countsByDay.entries()].map(([date, count]) => ({ date, count }));
}

function intersectIds(
	current: string[] | null,
	next: string[],
): string[] | null {
	if (next.length === 0) {
		return [];
	}
	if (current === null) {
		return next;
	}
	const allowed = new Set(next);
	return current.filter((id) => allowed.has(id));
}

async function postIdsWithMinRelationCount(
	db: Database,
	relation: "likes" | "comments",
	min: number,
): Promise<string[]> {
	const rows = await db.post.findMany({
		select: { id: true, _count: { select: { [relation]: true } } },
	});
	return rows
		.filter((row) => {
			const count =
				relation === "likes" ? row._count.likes : row._count.comments;
			return (count ?? 0) >= min;
		})
		.map((row) => row.id);
}

async function postIdsWithMinContentLength(
	db: Database,
	min: number,
): Promise<string[]> {
	const rows = await db.post.findMany({ select: { id: true, content: true } });
	return rows
		.filter((row) => row.content.trim().length >= min)
		.map((row) => row.id);
}

async function resolvePostIdFilters(
	db: Database,
	input: AdminPostListFilters,
): Promise<string[] | null> {
	let ids: string[] | null = null;

	if (input.minLikes != null && input.minLikes > 0) {
		const matched = await postIdsWithMinRelationCount(
			db,
			"likes",
			input.minLikes,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	if (input.minComments != null && input.minComments > 0) {
		const matched = await postIdsWithMinRelationCount(
			db,
			"comments",
			input.minComments,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	if (input.minContentLength != null && input.minContentLength > 0) {
		const matched = await postIdsWithMinContentLength(
			db,
			input.minContentLength,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	return ids;
}

function adminPostExtraWhere(
	input: AdminPostListFilters,
): Prisma.PostWhereInput {
	const parts: Prisma.PostWhereInput[] = [];

	if (input.authorUsername) {
		parts.push({ author: { username: input.authorUsername } });
	}
	if (input.authorUsernames?.length) {
		parts.push({ author: { username: { in: input.authorUsernames } } });
	}
	if (input.hasAttachedBook != null) {
		parts.push(postAttachedBookWhere(input.hasAttachedBook));
	}
	if (input.hasImage === true) {
		parts.push({ imageUrl: { not: null } });
	}
	if (input.hasImage === false) {
		parts.push({ imageUrl: null });
	}
	if (input.hasAttachment === true) {
		parts.push({ attachment: { isNot: null } });
	}
	if (input.hasAttachment === false) {
		parts.push({ attachment: { is: null } });
	}
	if (input.attachmentKinds?.length) {
		parts.push({ attachment: { kind: { in: input.attachmentKinds } } });
	}
	if (input.wasEdited === true) {
		parts.push({ editedAt: { not: null } });
	}
	if (input.wasEdited === false) {
		parts.push({ editedAt: null });
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminPostListWhere(
	input: AdminPostListQueryInput,
	db: Database,
): Promise<{ where: Prisma.PostWhereInput | null; empty: boolean }> {
	const ranging = adminPostListRanging.from(input);
	const searching = adminPostListSearching.from(input);
	const idFilter = await resolvePostIdFilters(db, input);

	if (idFilter?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.PostWhereInput>(
		ranging.use(),
		searching.use(),
		adminPostExtraWhere(input),
		{
			id: idFilter ? { in: idFilter } : undefined,
		},
	);

	return { where, empty: false };
}

function mapAdminPostListRow(
	row: Prisma.PostGetPayload<{ select: typeof adminPostListSelect }>,
) {
	return {
		id: row.id,
		slug: row.slug,
		content: row.content,
		contentLength: row.content.trim().length,
		imageUrl: row.imageUrl,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		editedAt: row.editedAt,
		author: row.author,
		attachedBook: row.attachedBook,
		attachmentKind: row.attachment?.kind ?? null,
		counts: {
			likes: row._count.likes,
			comments: row._count.comments,
		},
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.PostOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.PostOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

export async function listAdminPosts(
	input: ListAdminPostsInput,
	db: Database,
): Promise<ListAdminPostsOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminPostListSorting.from(input);

	const { where, empty } = await buildAdminPostListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.post.count({ where }),
		db.post.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminPostListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminPostListRow), total);
}

function emptyAdminPostOverview(): AdminPostOverviewOutput {
	return {
		kpis: {
			totalPosts: 0,
			withImage: 0,
			withAttachedBook: 0,
			withAttachment: 0,
			edited: 0,
			totalLikes: 0,
			totalComments: 0,
			distinctAuthors: 0,
			postedLast7Days: 0,
			postedLast30Days: 0,
		},
		postsByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminPostRankings(),
	};
}

export async function getAdminPostOverview(
	input: GetAdminPostOverviewInput,
	db: Database,
): Promise<AdminPostOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminPostListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminPostOverview();
	}

	const posts = await db.post.findMany({
		where,
		select: {
			authorId: true,
			imageUrl: true,
			attachedBookId: true,
			editedAt: true,
			createdAt: true,
			attachment: { select: { id: true } },
			_count: { select: { likes: true, comments: true } },
		},
	});

	const authorIds = new Set<string>();
	let withImage = 0;
	let withAttachedBook = 0;
	let withAttachment = 0;
	let edited = 0;
	let totalLikes = 0;
	let totalComments = 0;
	let postedLast7Days = 0;
	let postedLast30Days = 0;

	for (const row of posts) {
		authorIds.add(row.authorId);
		totalLikes += row._count.likes;
		totalComments += row._count.comments;
		if (row.imageUrl) {
			withImage += 1;
		}
		if (row.attachedBookId) {
			withAttachedBook += 1;
		}
		if (row.attachment) {
			withAttachment += 1;
		}
		if (row.editedAt) {
			edited += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			postedLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			postedLast30Days += 1;
		}
	}

	const rankings = await loadAdminPostRankings(db, where);

	return {
		kpis: {
			totalPosts: posts.length,
			withImage,
			withAttachedBook,
			withAttachment,
			edited,
			totalLikes,
			totalComments,
			distinctAuthors: authorIds.size,
			postedLast7Days,
			postedLast30Days,
		},
		postsByDay: buildAdditionsByDay(posts, 30),
		rankings,
	};
}

function contentLengthBucket(length: number): string {
	if (length < 120) {
		return "Under 120 chars";
	}
	if (length < 400) {
		return "120–399 chars";
	}
	return "400+ chars";
}

function likesBucket(count: number): string {
	if (count === 0) {
		return "No likes";
	}
	if (count <= 3) {
		return "1–3 likes";
	}
	return "4+ likes";
}

export async function getAdminPostStats(
	input: GetAdminPostStatsInput,
	db: Database,
): Promise<GetAdminPostStatsOutput> {
	const { where, empty } = await buildAdminPostListWhere(input, db);
	if (empty || where === null) {
		return {
			postsByDay: buildAdditionsByDay([], 30),
			attachmentKindMix: [],
			contentLengthHistogram: [],
			engagementFunnel: [],
			likesHistogram: [],
		};
	}

	const posts = await db.post.findMany({
		where,
		select: {
			content: true,
			createdAt: true,
			imageUrl: true,
			attachedBookId: true,
			editedAt: true,
			attachment: { select: { kind: true } },
			_count: { select: { likes: true, comments: true } },
		},
	});

	const kindCounts = new Map<string, number>();
	const lengthHistogram = new Map<string, number>();
	const likesHistogram = new Map<string, number>();
	let withComments = 0;
	let withLikes = 0;
	let withImage = 0;
	let withBook = 0;
	let withAttachment = 0;

	for (const row of posts) {
		const lengthBucket = contentLengthBucket(row.content.trim().length);
		lengthHistogram.set(
			lengthBucket,
			(lengthHistogram.get(lengthBucket) ?? 0) + 1,
		);
		const likeBucket = likesBucket(row._count.likes);
		likesHistogram.set(likeBucket, (likesHistogram.get(likeBucket) ?? 0) + 1);

		if (row._count.comments > 0) {
			withComments += 1;
		}
		if (row._count.likes > 0) {
			withLikes += 1;
		}
		if (row.imageUrl) {
			withImage += 1;
		}
		if (row.attachedBookId) {
			withBook += 1;
		}
		if (row.attachment) {
			withAttachment += 1;
			kindCounts.set(
				row.attachment.kind,
				(kindCounts.get(row.attachment.kind) ?? 0) + 1,
			);
		}
	}

	const total = posts.length;

	return {
		postsByDay: buildAdditionsByDay(posts, 30),
		attachmentKindMix: [...kindCounts.entries()].map(([kind, count]) => ({
			kind: kind as (typeof postAttachmentKindValues)[number],
			count,
		})),
		contentLengthHistogram: [...lengthHistogram.entries()].map(
			([label, value]) => ({ label, value }),
		),
		engagementFunnel: [
			{ stage: "All posts", count: total },
			{ stage: "With image", count: withImage },
			{ stage: "With attachment", count: withAttachment },
			{ stage: "With likes", count: withLikes },
			{ stage: "With comments", count: withComments },
			{ stage: "Attached book", count: withBook },
		],
		likesHistogram: [...likesHistogram.entries()].map(([label, value]) => ({
			label,
			value,
		})),
	};
}
