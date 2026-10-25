"use client";

import {
	parseStoredContent,
	replaceMentionsWithText,
	serializeRichDocument,
} from "@bbrc/shared";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import {
	type MentionContentKind,
	viewerMentionKey,
} from "./use-viewer-mention";

type Me = { id: string; username: string };

/** The text with this member's mentions turned into plain text. */
function withoutMyMention(raw: string, me: Me): string {
	try {
		const doc = parseStoredContent(raw);
		const mine = me.username.toLowerCase();
		return serializeRichDocument(
			replaceMentionsWithText(doc, (node) =>
				node.userId
					? node.userId !== me.id
					: node.username.toLowerCase() !== mine,
			),
		);
	} catch {
		return raw;
	}
}

/**
 * Walks cached data and rewrites the text of the one post, comment or review with
 * this slug wherever it is cached (lists, pages, threads). Returns the same object
 * when nothing changed.
 */
function patchContent(
	data: unknown,
	field: "content" | "review",
	slug: string,
	me: Me,
	depth = 0,
): unknown {
	if (depth > 8 || data == null || typeof data !== "object") return data;
	if (Array.isArray(data)) {
		let changed = false;
		const next = data.map((item) => {
			const patched = patchContent(item, field, slug, me, depth + 1);
			if (patched !== item) changed = true;
			return patched;
		});
		return changed ? next : data;
	}
	const record = data as Record<string, unknown>;
	let changed = false;
	const next: Record<string, unknown> = { ...record };
	if (record.slug === slug && typeof record[field] === "string") {
		const text = withoutMyMention(record[field] as string, me);
		if (text !== record[field]) {
			next[field] = text;
			changed = true;
		}
	}
	for (const [key, value] of Object.entries(record)) {
		const patched = patchContent(value, field, slug, me, depth + 1);
		if (patched !== value) {
			next[key] = patched;
			changed = true;
		}
	}
	return changed ? next : data;
}

/** "Remove my mention": the mention disappears from the screen at once and comes back if the server refuses. */
export function useRemoveMyMention(kind: MentionContentKind, slug: string) {
	const { data: session } = authClient.useSession();

	return useMutation(
		orpc.mention.remove.mutationOptions({
			onMutate: async () => {
				const user = session?.user;
				const snapshots: [readonly unknown[], unknown][] = [];
				if (user?.username) {
					const me: Me = { id: user.id, username: user.username };
					const field = kind === "review" ? "review" : "content";
					for (const query of queryClient.getQueryCache().findAll()) {
						const before = query.state.data;
						if (before == null) continue;
						const after = patchContent(before, field, slug, me);
						if (after !== before) {
							snapshots.push([query.queryKey, before]);
							queryClient.setQueryData(query.queryKey, after);
						}
					}
				}
				const flagKey = viewerMentionKey(kind, slug);
				const previousFlag = queryClient.getQueryData<string | null>(flagKey);
				queryClient.setQueryData(flagKey, null);
				return { snapshots, flagKey, previousFlag };
			},
			onError: (error, _input, context) => {
				for (const [key, data] of context?.snapshots ?? []) {
					queryClient.setQueryData(key, data);
				}
				if (context) {
					queryClient.setQueryData(context.flagKey, context.previousFlag);
				}
				toast.error(error.message || "Could not remove your mention.");
			},
			onSuccess: () => {
				toast.success("Your mention was removed.");
				void queryClient.invalidateQueries({ queryKey: orpc.mention.key() });
				void queryClient.invalidateQueries({ queryKey: orpc.post.key() });
				void queryClient.invalidateQueries({ queryKey: orpc.comment.key() });
				void queryClient.invalidateQueries({ queryKey: orpc.feedback.key() });
			},
		}),
	);
}
