"use client";

import type { ExternalLinkPreview } from "@bbrc/api/modules/link-preview/link-preview.schema";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

type Waiting = {
	url: string;
	resolve: (preview: ExternalLinkPreview) => void;
	reject: (error: unknown) => void;
};

const waiting = new Map<string, Waiting[]>();
let scheduled = false;

/** Every outside link asked for in the same moment goes out as one request. */
async function flush() {
	scheduled = false;
	const batch = [...waiting.entries()];
	waiting.clear();

	for (let start = 0; start < batch.length; start += 12) {
		const chunk = batch.slice(start, start + 12);
		try {
			const { items } = await client.linkPreview.resolveExternal({
				urls: chunk.map(([url]) => url),
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

function loadExternalPreview(url: string): Promise<ExternalLinkPreview> {
	return new Promise((resolve, reject) => {
		const listeners = waiting.get(url) ?? [];
		listeners.push({ url, resolve, reject });
		waiting.set(url, listeners);
		if (!scheduled) {
			scheduled = true;
			setTimeout(() => void flush(), 15);
		}
	});
}

/**
 * What an outside page says about itself (title, description, our copy of its
 * picture). Only https links are asked about; the result can be `status: "none"`
 * (show the plain card).
 */
export function useExternalLinkPreview(
	href: string,
	options: { enabled?: boolean } = {},
) {
	const asks = /^https:\/\//i.test(href);
	return useQuery({
		queryKey: ["external-link-preview", href],
		queryFn: () => loadExternalPreview(href),
		enabled: asks && (options.enabled ?? true),
		staleTime: 10 * 60_000,
		gcTime: 30 * 60_000,
		retry: false,
	});
}
