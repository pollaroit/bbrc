"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { client, queryClient } from "@/utils/orpc";

export type LikeKind = "post" | "comment" | "feedback";

const BATCH_DELAY_MS = 16;
const MAX_BATCH = 200;

type Waiter = {
	resolve: (liked: boolean) => void;
	reject: (e: unknown) => void;
};

const waiting: Record<LikeKind, Map<string, Waiter[]>> = {
	post: new Map(),
	comment: new Map(),
	feedback: new Map(),
};
let timer: ReturnType<typeof setTimeout> | undefined;

async function flushBatch() {
	timer = undefined;
	const batch = {
		post: [...waiting.post.entries()],
		comment: [...waiting.comment.entries()],
		feedback: [...waiting.feedback.entries()],
	};
	waiting.post = new Map();
	waiting.comment = new Map();
	waiting.feedback = new Map();

	const kinds = Object.keys(batch) as LikeKind[];
	const all = kinds.flatMap((kind) =>
		batch[kind].map(([slug]) => ({ kind, slug })),
	);

	// Split very large pages across calls so the API's per-kind cap holds.
	for (let start = 0; start < all.length; start += MAX_BATCH) {
		const chunk = all.slice(start, start + MAX_BATCH);
		const input = {
			postSlugs: chunk.filter((c) => c.kind === "post").map((c) => c.slug),
			commentSlugs: chunk
				.filter((c) => c.kind === "comment")
				.map((c) => c.slug),
			feedbackSlugs: chunk
				.filter((c) => c.kind === "feedback")
				.map((c) => c.slug),
		};

		try {
			const result = await client.like.getViewerLikes(input);
			const liked = {
				post: new Set(result.postSlugs),
				comment: new Set(result.commentSlugs),
				feedback: new Set(result.feedbackSlugs),
			};
			for (const { kind, slug } of chunk) {
				const waiters = batch[kind].find(([s]) => s === slug)?.[1] ?? [];
				for (const waiter of waiters) {
					waiter.resolve(liked[kind].has(slug));
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

/** Collects every heart that mounts in the same moment into a single request. */
function loadViewerLike(kind: LikeKind, slug: string): Promise<boolean> {
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

export function viewerLikeKey(kind: LikeKind, slug: string) {
	return ["viewer-like", kind, slug] as const;
}

export function setViewerLike(kind: LikeKind, slug: string, liked: boolean) {
	queryClient.setQueryData(viewerLikeKey(kind, slug), liked);
}

/**
 * Whether the signed-in viewer liked this item. Pre-rendered lists are built
 * for anonymous visitors, so their `likedByMe` is always false; this asks the
 * server once (batched across the page) and returns `undefined` until known.
 */
export function useViewerLike(
	kind: LikeKind,
	slug: string,
): boolean | undefined {
	const { data: session } = authClient.useSession();
	const query = useQuery({
		queryKey: viewerLikeKey(kind, slug),
		queryFn: () => loadViewerLike(kind, slug),
		enabled: Boolean(session?.user) && !isPendingSlug(slug),
		staleTime: 60_000,
	});
	return query.data;
}
