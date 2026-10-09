import { buildListCallInput } from "@/lib/listing/build-list-call-input";

export function extractExportFilters(
	listInput: Record<string, unknown>,
): Record<string, unknown> {
	const {
		page: _page,
		limit: _limit,
		sortBy: _sortBy,
		sortDirection: _sortDirection,
		...rest
	} = listInput;
	return buildListCallInput(
		rest as Record<
			string,
			string | number | boolean | Date | readonly string[] | null | undefined
		>,
	);
}

export function extractExportSorting(listInput: Record<string, unknown>) {
	const sortBy = listInput.sortBy;
	const sortDirection = listInput.sortDirection;
	if (sortBy == null || sortDirection == null) {
		return null;
	}
	return {
		sortBy: String(sortBy),
		sortDirection: String(sortDirection),
	};
}

export function serializeExportMeta(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Array.isArray(value)) {
		return value.map((entry) => serializeExportMeta(entry));
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				key,
				serializeExportMeta(entry),
			]),
		);
	}
	return value;
}
