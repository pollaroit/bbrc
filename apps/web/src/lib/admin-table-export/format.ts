import type { AdminTableExportField, AdminTableExportFormat } from "./types";

export function serializeExportValue(
	value: unknown,
): string | number | boolean | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "boolean" || typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value)) {
		return value
			.map((entry) => String(serializeExportValue(entry) ?? ""))
			.join("; ");
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

export function formatExportCell(value: unknown): string {
	const serialized = serializeExportValue(value);
	if (serialized === null) {
		return "";
	}
	return String(serialized);
}

function escapeCsvCell(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
}

export function buildExportRows<TItem>(
	items: TItem[],
	fields: AdminTableExportField<TItem>[],
	selectedKeys: Set<string>,
): Record<string, string | number | boolean | null>[] {
	const activeFields = fields.filter((field) => selectedKeys.has(field.key));

	return items.map((item) => {
		const row: Record<string, string | number | boolean | null> = {};
		for (const field of activeFields) {
			row[field.key] = serializeExportValue(field.getValue(item));
		}
		return row;
	});
}

export function rowsToCsv(
	rows: Record<string, string | number | boolean | null>[],
	fieldKeys: string[],
	fieldLabelsByKey: Map<string, string>,
): string {
	const header = fieldKeys.map((key) =>
		escapeCsvCell(fieldLabelsByKey.get(key) ?? key),
	);
	const lines = [header.join(",")];

	for (const row of rows) {
		const line = fieldKeys.map((key) =>
			escapeCsvCell(formatExportCell(row[key])),
		);
		lines.push(line.join(","));
	}

	return `${lines.join("\n")}\n`;
}

export function downloadExportFile(
	content: string,
	filename: string,
	format: AdminTableExportFormat,
) {
	const mimeType =
		format === "json"
			? "application/json;charset=utf-8"
			: "text/csv;charset=utf-8";
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export function defaultExportFilename(
	resource: string,
	format: AdminTableExportFormat,
): string {
	return `bbrc-${resource}-table.${format}`;
}

export function sanitizeExportFilename(
	input: string,
	format: AdminTableExportFormat,
) {
	const trimmed = input.trim();
	const base =
		trimmed.length > 0
			? trimmed.replace(/\.(json|csv)$/i, "")
			: "bbrc-export-table";
	const safe = base.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
	return `${safe}.${format}`;
}
