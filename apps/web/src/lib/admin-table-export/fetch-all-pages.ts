import type { AdminTableExportPageResult } from "./types";

const EXPORT_PAGE_SIZE = 100;

export async function fetchAllAdminTableItems<TItem>(
	fetchPage: (
		page: number,
		limit: number,
	) => Promise<AdminTableExportPageResult<TItem>>,
): Promise<TItem[]> {
	const first = await fetchPage(1, EXPORT_PAGE_SIZE);
	const items = [...first.items];

	for (let page = 2; page <= first.metadata.totalPages; page += 1) {
		const next = await fetchPage(page, EXPORT_PAGE_SIZE);
		items.push(...next.items);
	}

	return items;
}
