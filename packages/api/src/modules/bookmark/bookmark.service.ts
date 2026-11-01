import type { Database, Prisma } from "@bbrc/db";
import { BookmarkResourceTypeSchema } from "@bbrc/schemas";
import { isSuperAdmin, type Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	buildCommentListItemsByIds,
	loadCommentBookmarkContexts,
} from "../comment/comment.service";
import { threadCommentVisibleWhere } from "../comment/comment-visibility";
import { buildPostListItemsByIds } from "../post/post.service";
import { assertPostVisible } from "../post/post-visibility";
import {
	assertMemberAvailable,
	memberAccessSelect,
} from "../user/member-access";
import { bookmarkListSorting } from "./bookmark.listing";
import {
	bookmarkListSelect,
	type GetBookmarkCountsInput,
	type GetBookmarkCountsOutput,
	type GetBookmarkListInput,
	type GetBookmarkListOutput,
	type GetViewerBookmarksInput,
	type GetViewerBookmarksOutput,
	type ListSavedBookmarksInput,
	type ListSavedBookmarksOutput,
	type SetBookmarkInput,
	type ToggleBookmarkInput,
	type ToggleBookmarkOutput,
} from "./bookmark.schema";
import { decideBookmarksAccess } from "./bookmark-access";

type BookmarkTarget =
	| {
			resourceType: typeof BookmarkResourceTypeSchema.enum.post;
			resourceId: string;
			resourceCreatedAt: Date;
			authorId: string;
	  }
	| {
			resourceType: typeof BookmarkResourceTypeSchema.enum.comment;
			resourceId: string;
			resourceCreatedAt: Date;
			authorId: string;
	  };

type BookmarkListRow = Prisma.BookmarkGetPayload<{
	select: {
		id: true;
		createdAt: true;
		resourceCreatedAt: true;
		resourceType: true;
		resourceId: true;
	};
}>;

type BookmarkMarkListRow = Prisma.BookmarkGetPayload<{
	select: typeof bookmarkListSelect;
}>;

const bookmarkListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: BookmarkListRow): string {
		return item.id;
	},
};

const bookmarkMarkListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: BookmarkMarkListRow): string {
		return item.id;
	},
};

function withStableIdOrderBy(
	orderBy: Prisma.BookmarkOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.BookmarkOrderByWithRelationInput[] {
	return [orderBy, { id: sortDirection }];
}

async function resolvePostBookmarkTarget(
	postSlug: string,
	db: Database,
	viewer: Viewer,
): Promise<BookmarkTarget> {
	const post = await db.post.findUnique({
		where: { slug: postSlug },
		select: {
			id: true,
			createdAt: true,
			authorId: true,
			allowBookmarks: true,
		},
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", {
			message: "Post not found",
			data: { slug: postSlug },
		});
	}

	await assertPostVisible(db, { id: post.id }, viewer, "Post not found", {
		slug: postSlug,
	});

	if (!post.allowBookmarks) {
		throw new ORPCError("FORBIDDEN", {
			message: "Bookmarks are turned off for this post.",
		});
	}

	return {
		resourceType: BookmarkResourceTypeSchema.enum.post,
		resourceId: post.id,
		resourceCreatedAt: post.createdAt,
		authorId: post.authorId,
	};
}

async function resolveCommentBookmarkTarget(
	commentSlug: string,
	db: Database,
	viewer: Viewer,
): Promise<BookmarkTarget> {
	const comment = await db.comment.findFirst({
		where: { AND: [{ slug: commentSlug }, threadCommentVisibleWhere(viewer)] },
		select: {
			id: true,
			createdAt: true,
			authorId: true,
			allowBookmarks: true,
			postId: true,
			post: { select: { allowBookmarks: true } },
		},
	});

	if (!comment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Comment not found",
			data: { slug: commentSlug },
		});
	}

	if (!comment.allowBookmarks) {
		throw new ORPCError("FORBIDDEN", {
			message: "Bookmarks are turned off for this comment.",
		});
	}

	if (comment.postId && comment.post && !comment.post.allowBookmarks) {
		throw new ORPCError("FORBIDDEN", {
			message: "Bookmarks are turned off for this post.",
		});
	}

	return {
		resourceType: BookmarkResourceTypeSchema.enum.comment,
		resourceId: comment.id,
		resourceCreatedAt: comment.createdAt,
		authorId: comment.authorId,
	};
}

async function resolveBookmarkTarget(
	input: ToggleBookmarkInput,
	db: Database,
	viewer: Viewer,
): Promise<BookmarkTarget> {
	if (input.postSlug) {
		return resolvePostBookmarkTarget(input.postSlug, db, viewer);
	}
	if (input.commentSlug) {
		return resolveCommentBookmarkTarget(input.commentSlug, db, viewer);
	}
	throw new ORPCError("BAD_REQUEST", {
		message: "Provide postSlug or commentSlug",
	});
}

async function countBookmarksForTarget(
	target: Pick<BookmarkTarget, "resourceType" | "resourceId">,
	db: Pick<Database, "bookmark">,
): Promise<number> {
	return db.bookmark.count({
		where: {
			resourceType: target.resourceType,
			resourceId: target.resourceId,
		},
	});
}

function existingBookmarkWhere(
	target: Pick<BookmarkTarget, "resourceType" | "resourceId">,
	userId: string,
): Prisma.BookmarkWhereInput {
	return {
		userId,
		resourceType: target.resourceType,
		resourceId: target.resourceId,
	};
}

export async function setBookmark(
	input: SetBookmarkInput,
	userId: string,
	db: Database,
	viewer: Viewer,
): Promise<ToggleBookmarkOutput> {
	const target = await resolveBookmarkTarget(input, db, viewer);

	if (input.bookmarked) {
		await db.bookmark.upsert({
			where: {
				userId_resourceType_resourceId: {
					userId,
					resourceType: target.resourceType,
					resourceId: target.resourceId,
				},
			},
			create: {
				userId,
				resourceType: target.resourceType,
				resourceId: target.resourceId,
				resourceCreatedAt: target.resourceCreatedAt,
			},
			update: {},
		});
	} else {
		await db.bookmark.deleteMany({
			where: existingBookmarkWhere(target, userId),
		});
	}

	const bookmarkCount = await countBookmarksForTarget(target, db);
	return { bookmarked: input.bookmarked, bookmarkCount };
}

export async function toggleBookmark(
	input: ToggleBookmarkInput,
	userId: string,
	db: Database,
	viewer: Viewer,
): Promise<ToggleBookmarkOutput> {
	const target = await resolveBookmarkTarget(input, db, viewer);
	const existing = await db.bookmark.findFirst({
		where: existingBookmarkWhere(target, userId),
		select: { id: true },
	});
	return setBookmark({ ...input, bookmarked: !existing }, userId, db, viewer);
}

export async function getViewerBookmarks(
	input: GetViewerBookmarksInput,
	userId: string | null,
	db: Database,
): Promise<GetViewerBookmarksOutput> {
	if (!userId) {
		return { postSlugs: [], commentSlugs: [] };
	}

	const [posts, comments] = await Promise.all([
		input.postSlugs.length
			? db.bookmark.findMany({
					where: {
						userId,
						resourceType: BookmarkResourceTypeSchema.enum.post,
						resourceId: {
							in: (
								await db.post.findMany({
									where: { slug: { in: input.postSlugs } },
									select: { id: true },
								})
							).map((p) => p.id),
						},
					},
					select: { resourceId: true },
				})
			: [],
		input.commentSlugs.length
			? db.bookmark.findMany({
					where: {
						userId,
						resourceType: BookmarkResourceTypeSchema.enum.comment,
						resourceId: {
							in: (
								await db.comment.findMany({
									where: { slug: { in: input.commentSlugs } },
									select: { id: true },
								})
							).map((c) => c.id),
						},
					},
					select: { resourceId: true },
				})
			: [],
	]);

	const postIdSet = new Set(posts.map((b) => b.resourceId));
	const commentIdSet = new Set(comments.map((b) => b.resourceId));

	const [postSlugs, commentSlugs] = await Promise.all([
		postIdSet.size
			? db.post
					.findMany({
						where: { id: { in: [...postIdSet] } },
						select: { slug: true },
					})
					.then((rows) => rows.map((r) => r.slug))
			: [],
		commentIdSet.size
			? db.comment
					.findMany({
						where: { id: { in: [...commentIdSet] } },
						select: { slug: true },
					})
					.then((rows) => rows.map((r) => r.slug))
			: [],
	]);

	return { postSlugs, commentSlugs };
}

export async function getBookmarkCounts(
	input: GetBookmarkCountsInput,
	userId: string | null,
	db: Database,
): Promise<GetBookmarkCountsOutput> {
	const posts: Record<string, number> = {};
	const comments: Record<string, number> = {};
	if (!userId) return { posts, comments };

	if (input.postSlugs.length) {
		const rows = await db.post.findMany({
			where: { slug: { in: input.postSlugs }, authorId: userId },
			select: { id: true, slug: true },
		});
		if (rows.length) {
			const counts = await db.bookmark.groupBy({
				by: ["resourceId"],
				where: {
					resourceType: BookmarkResourceTypeSchema.enum.post,
					resourceId: { in: rows.map((r) => r.id) },
				},
				_count: { _all: true },
			});
			const byId = new Map(counts.map((c) => [c.resourceId, c._count._all]));
			for (const row of rows) {
				posts[row.slug] = byId.get(row.id) ?? 0;
			}
		}
	}

	if (input.commentSlugs.length) {
		const rows = await db.comment.findMany({
			where: { slug: { in: input.commentSlugs }, authorId: userId },
			select: { id: true, slug: true },
		});
		if (rows.length) {
			const counts = await db.bookmark.groupBy({
				by: ["resourceId"],
				where: {
					resourceType: BookmarkResourceTypeSchema.enum.comment,
					resourceId: { in: rows.map((r) => r.id) },
				},
				_count: { _all: true },
			});
			const byId = new Map(counts.map((c) => [c.resourceId, c._count._all]));
			for (const row of rows) {
				comments[row.slug] = byId.get(row.id) ?? 0;
			}
		}
	}

	return { posts, comments };
}

async function bookmarkTargetWhere(
	input: GetBookmarkListInput,
	db: Database,
): Promise<Prisma.BookmarkWhereInput> {
	if (input.postSlug) {
		const post = await db.post.findUnique({
			where: { slug: input.postSlug },
			select: { id: true },
		});
		if (!post) {
			throw new ORPCError("NOT_FOUND", { message: "Post not found." });
		}
		return {
			resourceType: BookmarkResourceTypeSchema.enum.post,
			resourceId: post.id,
		};
	}
	const comment = await db.comment.findUnique({
		where: { slug: input.commentSlug! },
		select: { id: true },
	});
	if (!comment) {
		throw new ORPCError("NOT_FOUND", { message: "Comment not found." });
	}
	return {
		resourceType: BookmarkResourceTypeSchema.enum.comment,
		resourceId: comment.id,
	};
}

export async function getBookmarkList(
	input: GetBookmarkListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetBookmarkListOutput> {
	if (input.postSlug) {
		const post = await db.post.findUnique({
			where: { slug: input.postSlug },
			select: { id: true, authorId: true },
		});
		const maySeePostList =
			post &&
			viewer.kind === "member" &&
			(isSuperAdmin(viewer) || post.authorId === viewer.userId);
		if (!maySeePostList) {
			throw new ORPCError("FORBIDDEN", {
				message: "Only the author can see who bookmarked this post.",
			});
		}
	} else {
		const comment = await db.comment.findUnique({
			where: { slug: input.commentSlug! },
			select: { authorId: true },
		});
		const maySeeCommentList =
			comment &&
			viewer.kind === "member" &&
			(isSuperAdmin(viewer) || comment.authorId === viewer.userId);
		if (!maySeeCommentList) {
			throw new ORPCError("FORBIDDEN", {
				message: "Only the author can see who bookmarked this comment.",
			});
		}
	}

	const pagination = definePagination.cursor(
		input,
		bookmarkMarkListCursorCodec,
	);
	const sorting = bookmarkListSorting.from(input);

	const where = await bookmarkTargetWhere(input, db);

	const rows = await db.bookmark.findMany({
		...pagination.use(),
		where,
		orderBy: withStableIdOrderBy(sorting.use(), sorting.sortDirection),
		select: bookmarkListSelect,
	});

	const page = pagination.paginate(rows);
	return {
		items: page.items.map((row) => ({
			user: row.user,
			bookmarkedAt: row.createdAt,
		})),
		metadata: page.metadata,
	};
}

async function searchMatchingResourceIds(
	db: Database,
	query: string,
	type: ListSavedBookmarksInput["type"],
): Promise<{ postIds: string[]; commentIds: string[] } | null> {
	const trimmed = query.trim();
	if (!trimmed) return null;

	const mode = { contains: trimmed, mode: "insensitive" as const };
	const [posts, comments] = await Promise.all([
		type === "comment"
			? []
			: db.post.findMany({
					where: {
						OR: [{ content: mode }, { slug: mode }],
					},
					select: { id: true },
					take: 500,
				}),
		type === "post"
			? []
			: db.comment.findMany({
					where: { OR: [{ content: mode }, { slug: mode }] },
					select: { id: true },
					take: 500,
				}),
	]);

	return {
		postIds: posts.map((p) => p.id),
		commentIds: comments.map((c) => c.id),
	};
}

type SavedBookmarkRow = {
	id: string;
	createdAt: Date;
	resourceCreatedAt: Date;
	resourceType: (typeof BookmarkResourceTypeSchema.enum)[keyof typeof BookmarkResourceTypeSchema.enum];
	resourceId: string;
};

async function hydrateSavedBookmarkPage(
	rows: SavedBookmarkRow[],
	db: Database,
	viewer: Viewer,
	isOwner: boolean,
): Promise<ListSavedBookmarksOutput["items"]> {
	const postIds = rows
		.filter((row) => row.resourceType === BookmarkResourceTypeSchema.enum.post)
		.map((row) => row.resourceId);
	const commentIds = rows
		.filter(
			(row) => row.resourceType === BookmarkResourceTypeSchema.enum.comment,
		)
		.map((row) => row.resourceId);

	const [postById, commentById, commentContextById] = await Promise.all([
		buildPostListItemsByIds(postIds, viewer, db),
		buildCommentListItemsByIds(commentIds, viewer, db),
		loadCommentBookmarkContexts(commentIds, db),
	]);

	const items: ListSavedBookmarksOutput["items"] = [];

	for (const row of rows) {
		const base = {
			id: row.id,
			bookmarkedAt: row.createdAt,
			resourceCreatedAt: row.resourceCreatedAt,
			kind: row.resourceType,
		};

		if (row.resourceType === BookmarkResourceTypeSchema.enum.post) {
			const post = postById.get(row.resourceId);
			if (post) {
				items.push({ ...base, kind: "post", post });
				continue;
			}
			if (isOwner) {
				items.push({ ...base, kind: "post", unavailable: true });
			}
			continue;
		}

		const comment = commentById.get(row.resourceId);
		const ctx = commentContextById.get(row.resourceId);
		const hasThread =
			ctx != null &&
			(ctx.postSlug != null ||
				(ctx.bookSlug != null && ctx.feedbackSlug != null));

		if (comment && ctx && hasThread) {
			items.push({
				...base,
				kind: "comment",
				comment: { ...comment, ...ctx },
			});
			continue;
		}

		if (isOwner) {
			items.push({ ...base, kind: "comment", unavailable: true });
		}
	}

	return items;
}

export async function listSavedBookmarks(
	input: ListSavedBookmarksInput,
	db: Database,
	viewer: Viewer,
): Promise<ListSavedBookmarksOutput> {
	const owner = await db.user.findUnique({
		where: { username: input.username },
		select: { ...memberAccessSelect, username: true },
	});
	assertMemberAvailable(owner, viewer, input.username);
	const access = decideBookmarksAccess(viewer, owner);
	if (access.kind === "unavailable") {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	if (access.kind === "closed") {
		throw new ORPCError("FORBIDDEN", {
			message: "This member's bookmarks are not visible to you.",
		});
	}

	const isOwner = access.kind === "full" && access.isOwner;
	const sorting = bookmarkListSorting.from(input);

	const searchIds = input.search
		? await searchMatchingResourceIds(db, input.search, input.type)
		: null;

	const typeFilter: Prisma.BookmarkWhereInput =
		input.type === "all" ? {} : { resourceType: input.type };

	const searchFilter: Prisma.BookmarkWhereInput = searchIds
		? {
				OR: [
					...(searchIds.postIds.length
						? [
								{
									resourceType: BookmarkResourceTypeSchema.enum.post,
									resourceId: { in: searchIds.postIds },
								},
							]
						: []),
					...(searchIds.commentIds.length
						? [
								{
									resourceType: BookmarkResourceTypeSchema.enum.comment,
									resourceId: { in: searchIds.commentIds },
								},
							]
						: []),
				],
			}
		: searchIds === null
			? {}
			: { id: { in: [] } };

	const where = mergeWhereFragments<Prisma.BookmarkWhereInput>(
		{ userId: owner.id },
		typeFilter,
		searchFilter,
	);

	const targetCount = input.limit ?? 24;
	const items: ListSavedBookmarksOutput["items"] = [];
	let cursor = input.cursor;
	let hasMore = true;

	while (items.length < targetCount && hasMore) {
		const pageInput = { ...input, cursor, limit: targetCount + 5 };
		const pagePagination = definePagination.cursor(
			pageInput,
			bookmarkListCursorCodec,
		);
		const rows = await db.bookmark.findMany({
			...pagePagination.use(),
			where,
			orderBy: withStableIdOrderBy(sorting.use(), sorting.sortDirection),
			select: {
				id: true,
				createdAt: true,
				resourceCreatedAt: true,
				resourceType: true,
				resourceId: true,
			},
		});

		const page = pagePagination.paginate(rows);
		hasMore = page.metadata.hasNextPage;
		cursor = page.metadata.nextCursor ?? undefined;

		const hydrated = await hydrateSavedBookmarkPage(
			page.items,
			db,
			viewer,
			isOwner,
		);
		for (const item of hydrated) {
			items.push(item);
			if (items.length >= targetCount) break;
		}

		if (page.items.length === 0) break;
	}

	return {
		items,
		metadata: {
			limit: targetCount,
			hasNextPage: hasMore,
			hasPreviousPage: Boolean(input.cursor),
			nextCursor: hasMore ? (cursor ?? null) : null,
		},
	};
}
