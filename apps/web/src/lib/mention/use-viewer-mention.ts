"use client";

import { useQuery } from "@tanstack/react-query";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { client } from "@/utils/orpc";

/*
 * Does the signed-in viewer have a mention on this post, comment or review?
 * Lists ask for many pieces of content at once, so the questions made in the same
 * moment are sent as one `mention.forContentBatch` call (60 slugs at most each).
 */

export type MentionContentKind = "post" | "comment" | "review";

type Resolver = {
	resolve: (mentionId: string | null) => void;
	reject: (reason: unknown) => void;
};

const BATCH_DELAY_MS = 15;
const MAX_SLUGS_PER_CALL = 60;

const waiting: Record<MentionContentKind, Map<string, Resolver[]>> = {
	post: new Map(),
	comment: new Map(),
	review: new Map(),
};
let scheduled = false;

async function flush() {
	scheduled = false;
	const batch = (Object.keys(waiting) as MentionContentKind[]).flatMap((kind) =>
		[...waiting[kind].entries()].map(([slug, resolvers]) => ({
			kind,
			slug,
			resolvers,
		})),
	);
	for (const kind of Object.keys(waiting) as MentionContentKind[]) {
		waiting[kind].clear();
	}

	for (let start = 0; start < batch.length; start += MAX_SLUGS_PER_CALL) {
		const chunk = batch.slice(start, start + MAX_SLUGS_PER_CALL);
		const slugsOf = (kind: MentionContentKind) =>
			chunk.filter((entry) => entry.kind === kind).map((entry) => entry.slug);
		try {
			const result = await client.mention.forContentBatch({
				postSlugs: slugsOf("post"),
				commentSlugs: slugsOf("comment"),
				feedbackSlugs: slugsOf("review"),
			});
			const found = new Map(
				result.items.map((item) => [
					`${item.kind}:${item.slug}`,
					item.mentionId,
				]),
			);
			for (const entry of chunk) {
				const mentionId = found.get(`${entry.kind}:${entry.slug}`) ?? null;
				for (const resolver of entry.resolvers) resolver.resolve(mentionId);
			}
		} catch (error) {
			for (const entry of chunk) {
				for (const resolver of entry.resolvers) resolver.reject(error);
			}
		}
	}
}

function askForMention(
	kind: MentionContentKind,
	slug: string,
): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const list = waiting[kind].get(slug) ?? [];
		list.push({ resolve, reject });
		waiting[kind].set(slug, list);
		if (!scheduled) {
			scheduled = true;
			setTimeout(() => void flush(), BATCH_DELAY_MS);
		}
	});
}

export const viewerMentionKey = (kind: MentionContentKind, slug: string) =>
	["viewer-mention", kind, slug] as const;

/** The id of the viewer's mention on this content, null when there is none, undefined while loading. */
export function useViewerMention(
	kind: MentionContentKind,
	slug: string,
	enabled = true,
) {
	const query = useQuery({
		queryKey: viewerMentionKey(kind, slug),
		queryFn: () => askForMention(kind, slug),
		enabled: enabled && slug.length > 0 && !isPendingSlug(slug),
		staleTime: 60_000,
		retry: false,
	});
	return query.data;
}
