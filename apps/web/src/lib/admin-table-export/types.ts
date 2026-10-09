export type AdminTableExportResource =
	| "users"
	| "books"
	| "sittings"
	| "feedbacks"
	| "shelves"
	| "posts"
	| "comments"
	| "documents";

export type AdminTableExportFormat = "json" | "csv";

export type AdminTableExportField<TItem> = {
	key: string;
	label: string;
	defaultSelected?: boolean;
	getValue: (item: TItem) => unknown;
};

export type AdminTableExportListMetadata = {
	total: number;
	totalPages: number;
	page: number;
};

export type AdminTableExportPageResult<TItem> = {
	items: TItem[];
	metadata: AdminTableExportListMetadata;
};
