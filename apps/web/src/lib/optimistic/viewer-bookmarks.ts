"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { client, queryClient } from "@/utils/orpc";

export type BookmarkKind = "post" | "comment";

const BATCH_DELAY_MS = 16;
const MAX_BATCH = 200;

type Waiter = {
	resolve: (bookmarked: boolean) => void;
	reject: (e: unknown) => void;
};

const waiting: Record<BookmarkKind, Map<string, Waiter[]>> = {
	post: new Map(),
	comment: new Map(),
};
let timer: ReturnType<typeof setTimeout> | undefined;

async function flushBatch() {
	timer = undefined;
	const batch = {
		post: [...waiting.post.entries()],
		comment: [...waiting.comment.entries()],
	};
	waiting.post = new Map();
	waiting.comment = new Map();

	const kinds = Object.keys(batch) as BookmarkKind[];
	const all = kinds.flatMap((kind) =>
		batch[kind].map(([slug]) => ({ kind, slug })),
	);

	for (let start = 0; start < all.length; start += MAX_BATCH) {
		const chunk = all.slice(start, start + MAX_BATCH);
		const input = {
			postSlugs: chunk.filter((c) => c.kind === "post").map((c) => c.slug),
			commentSlugs: chunk
				.filter((c) => c.kind === "comment")
				.map((c) => c.slug),
		};

		try {
			const result = await client.bookmark.getViewerBookmarks(input);
			const bookmarked = {
				post: new Set(result.postSlugs),
				comment: new Set(result.commentSlugs),
			};
			for (const { kind, slug } of chunk) {
				const waiters = batch[kind].find(([s]) => s === slug)?.[1] ?? [];
				for (const waiter of waiters) {
					waiter.resolve(bookmarked[kind].has(slug));
				}
			}
		} catch (error) {
			for (const { kind, slug } of chunk) {
				const waiters = batch[kind].find(([s]) => s === slug)?.[1] ?? [];
				for (const waiter of waiters) {
					waiter.reject(error);
				}
			}
		}
	}
}

function loadViewerBookmark(
	kind: BookmarkKind,
	slug: string,
): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const list = waiting[kind].get(slug) ?? [];
		list.push({ resolve, reject });
		waiting[kind].set(slug, list);
		if (timer == null) {
			timer = setTimeout(() => {
				void flushBatch();
			}, BATCH_DELAY_MS);
		}
	});
}

export function viewerBookmarkKey(kind: BookmarkKind, slug: string) {
	return ["viewer-bookmark", kind, slug] as const;
}

export function setViewerBookmark(
	kind: BookmarkKind,
	slug: string,
	bookmarked: boolean,
) {
	queryClient.setQueryData(viewerBookmarkKey(kind, slug), bookmarked);
}

export function useViewerBookmark(
	kind: BookmarkKind,
	slug: string,
): boolean | undefined {
	const { data: session } = authClient.useSession();
	const query = useQuery({
		queryKey: viewerBookmarkKey(kind, slug),
		queryFn: () => loadViewerBookmark(kind, slug),
		enabled: Boolean(session?.user) && !isPendingSlug(slug),
		staleTime: 60_000,
	});
	return query.data;
}

type CountWaiter = {
	resolve: (count: number) => void;
	reject: (e: unknown) => void;
};

const countWaiting: Record<BookmarkKind, Map<string, CountWaiter[]>> = {
	post: new Map(),
	comment: new Map(),
};
let countTimer: ReturnType<typeof setTimeout> | undefined;

async function flushCountBatch() {
	countTimer = undefined;
	const batch = {
		post: [...countWaiting.post.entries()],
		comment: [...countWaiting.comment.entries()],
	};
	countWaiting.post = new Map();
	countWaiting.comment = new Map();

	const postSlugs = batch.post.map(([slug]) => slug);
	const commentSlugs = batch.comment.map(([slug]) => slug);

	try {
		const result = await client.bookmark.getBookmarkCounts({
			postSlugs,
			commentSlugs,
		});
		for (const slug of postSlugs) {
			const waiters = batch.post.find(([s]) => s === slug)?.[1] ?? [];
			for (const waiter of waiters) {
				waiter.resolve(result.posts[slug] ?? 0);
			}
		}
		for (const slug of commentSlugs) {
			const waiters = batch.comment.find(([s]) => s === slug)?.[1] ?? [];
			for (const waiter of waiters) {
				waiter.resolve(result.comments[slug] ?? 0);
			}
		}
	} catch (error) {
		for (const [, waiters] of [...batch.post, ...batch.comment]) {
			for (const waiter of waiters) {
				waiter.reject(error);
			}
		}
	}
}

function loadBookmarkCount(kind: BookmarkKind, slug: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const map = countWaiting[kind];
		const list = map.get(slug) ?? [];
		list.push({ resolve, reject });
		map.set(slug, list);
		if (countTimer == null) {
			countTimer = setTimeout(() => {
				void flushCountBatch();
			}, BATCH_DELAY_MS);
		}
	});
}

export function bookmarkCountKey(kind: BookmarkKind, slug: string) {
	return ["bookmark-count", kind, slug] as const;
}

export function useBookmarkCount(
	kind: BookmarkKind,
	slug: string,
	enabled: boolean,
): number | undefined {
	const query = useQuery({
		queryKey: bookmarkCountKey(kind, slug),
		queryFn: () => loadBookmarkCount(kind, slug),
		enabled: enabled && !isPendingSlug(slug),
		staleTime: 30_000,
	});
	return query.data;
}
