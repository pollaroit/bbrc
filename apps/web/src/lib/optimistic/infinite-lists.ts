import type { QueryKey } from "@tanstack/react-query";
import { queryClient } from "@/utils/orpc";

/** Slugs are lowercase `a-z0-9_`, so this can never collide with a real one. */
export const PENDING_SLUG_PREFIX = "pending__";

export function createPendingSlug(): string {
	return `${PENDING_SLUG_PREFIX}${crypto.randomUUID().replaceAll("-", "")}`;
}

export function isPendingSlug(slug: string | null | undefined): boolean {
	return typeof slug === "string" && slug.startsWith(PENDING_SLUG_PREFIX);
}

type ListPage = { items: { slug: string }[] };
type ListData = { pages: ListPage[]; pageParams: unknown[] };

function isListData(value: unknown): value is ListData {
	return (
		typeof value === "object" &&
		value !== null &&
		Array.isArray((value as ListData).pages)
	);
}

/** The `input` an oRPC infinite query was made with. */
export function listInputOf(queryKey: QueryKey): Record<string, unknown> {
	const options = queryKey[1] as
		| { input?: Record<string, unknown> }
		| undefined;
	return options?.input ?? {};
}

function matchingQueries(
	prefix: QueryKey,
	accepts: (input: Record<string, unknown>) => boolean,
) {
	return queryClient
		.getQueriesData<unknown>({ queryKey: prefix })
		.filter(([key, data]) => isListData(data) && accepts(listInputOf(key)));
}

/** Puts `item` at the very top of every cached list the filter accepts. */
export function prependToLists<TItem extends { slug: string }>(
	prefix: QueryKey,
	item: TItem,
	accepts: (input: Record<string, unknown>) => boolean,
) {
	for (const [key, data] of matchingQueries(prefix, accepts)) {
		const list = data as ListData;
		const [first, ...rest] = list.pages;
		if (!first) {
			continue;
		}
		queryClient.setQueryData<ListData>(key, {
			...list,
			pages: [{ ...first, items: [item, ...first.items] }, ...rest],
		});
	}
}

/** Drops an item (by slug) from every cached list, e.g. to roll back a create. */
export function removeFromLists(prefix: QueryKey, slug: string) {
	for (const [key, data] of queryClient
		.getQueriesData<unknown>({ queryKey: prefix })
		.filter(([, value]) => isListData(value))) {
		const list = data as ListData;
		queryClient.setQueryData<ListData>(key, {
			...list,
			pages: list.pages.map((page) => ({
				...page,
				items: page.items.filter((entry) => entry.slug !== slug),
			})),
		});
	}
}

/** Swaps the temporary slug for the real one once the server has answered. */
export function swapListItemSlug(
	prefix: QueryKey,
	pendingSlug: string,
	realSlug: string,
) {
	for (const [key, data] of queryClient
		.getQueriesData<unknown>({ queryKey: prefix })
		.filter(([, value]) => isListData(value))) {
		const list = data as ListData;
		queryClient.setQueryData<ListData>(key, {
			...list,
			pages: list.pages.map((page) => ({
				...page,
				items: page.items.map((entry) =>
					entry.slug === pendingSlug ? { ...entry, slug: realSlug } : entry,
				),
			})),
		});
	}
}
