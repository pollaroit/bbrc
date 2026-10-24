"use client";

import type {
	InternalLinkRefInput,
	LinkPreview,
} from "@bbrc/api/modules/link-preview/link-preview.schema";
import { hrefFromInternalLinkRef, type InternalLinkRef } from "@bbrc/shared";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

type Waiting = {
	ref: InternalLinkRefInput;
	resolve: (preview: LinkPreview) => void;
	reject: (error: unknown) => void;
};

const waiting = new Map<string, Waiting[]>();
let scheduled = false;

/** Collect every preview asked for in the same moment into one request. */
async function flush() {
	scheduled = false;
	const batch = [...waiting.entries()];
	waiting.clear();

	for (let start = 0; start < batch.length; start += 12) {
		const chunk = batch.slice(start, start + 12);
		try {
			const { items } = await client.linkPreview.resolve({
				refs: chunk.map(
					([, listeners]) => listeners[0]?.ref as InternalLinkRefInput,
				),
			});
			chunk.forEach(([, listeners], index) => {
				const item = items[index];
				for (const listener of listeners) {
					if (item) listener.resolve(item);
					else listener.reject(new Error("No preview"));
				}
			});
		} catch (error) {
			for (const [, listeners] of chunk) {
				for (const listener of listeners) listener.reject(error);
			}
		}
	}
}

function loadPreview(ref: InternalLinkRefInput): Promise<LinkPreview> {
	const key = hrefFromInternalLinkRef(ref as InternalLinkRef);
	return new Promise((resolve, reject) => {
		const listeners = waiting.get(key) ?? [];
		listeners.push({ ref, resolve, reject });
		waiting.set(key, listeners);
		if (!scheduled) {
			scheduled = true;
			setTimeout(() => void flush(), 12);
		}
	});
}

/** The preview of an on-site link. Many calls in one render share one request. */
export function useLinkPreview(
	ref: InternalLinkRef | null,
	options: { enabled?: boolean } = {},
) {
	const key = ref ? hrefFromInternalLinkRef(ref) : "none";
	return useQuery({
		queryKey: ["link-preview", key],
		queryFn: () => loadPreview(ref as InternalLinkRefInput),
		enabled: ref != null && (options.enabled ?? true),
		staleTime: 5 * 60_000,
		retry: false,
	});
}
