import type {
	BookExportFieldKey,
	ExportBookListOutput,
} from "@bbrc/api/modules/book/book-export.schema";
import { bookExportFieldLabels } from "@/lib/books/export-fields";
import type { BookExportFormat } from "@/lib/books/export-filename";

type ExportRow = ExportBookListOutput["items"][number];

function capitalizeStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

function floorRating(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "";
	}

	return (Math.floor(value * 10) / 10).toFixed(1);
}

function formatCell(field: BookExportFieldKey, row: ExportRow): string {
	switch (field) {
		case "title":
			return row.title;
		case "authors":
			return row.authors.join(", ");
		case "status":
			return capitalizeStatus(row.status);
		case "averageRating":
			return floorRating(row.averageRating);
		case "openLibraryRating":
			return floorRating(row.openLibraryRating);
		case "pages":
			return String(row.pages);
		case "publishedIn":
			return String(row.publishedIn);
		case "slug":
			return row.slug;
		case "olid":
			return row.olid;
		case "excerpt":
			return row.excerpt ?? "";
		case "subjects":
			return row.subjects.join(", ");
		case "subjectPeople":
			return row.subjectPeople.join(", ");
		case "subjectTimes":
			return row.subjectTimes.join(", ");
		case "feedbackCount":
			return String(row.feedbackCount);
		case "favoriteCount":
			return String(row.favoriteCount);
		case "createdAt":
			return row.createdAt.toISOString();
		case "updatedAt":
			return row.updatedAt.toISOString();
		default:
			return "";
	}
}

function escapeCsv(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	return value;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeHtml(value: string): string {
	return escapeXml(value);
}

function pickRows(
	items: ExportRow[],
	fields: BookExportFieldKey[],
): Record<string, string>[] {
	return items.map((row) => {
		const record: Record<string, string> = {};

		for (const field of fields) {
			record[field] = formatCell(field, row);
		}

		return record;
	});
}

export function serializeBookExport(
	format: BookExportFormat,
	items: ExportRow[],
	fields: BookExportFieldKey[],
): string {
	const rows = pickRows(items, fields);

	switch (format) {
		case "json":
			return `${JSON.stringify(rows, null, 2)}\n`;
		case "csv": {
			const header = fields.map((field) =>
				escapeCsv(bookExportFieldLabels[field]),
			);
			const lines = rows.map((row) =>
				fields.map((field) => escapeCsv(row[field] ?? "")).join(","),
			);
			return [header.join(","), ...lines].join("\n");
		}
		case "txt":
			return rows
				.map((row) => fields.map((field) => row[field] ?? "").join("\t"))
				.join("\n");
		case "md": {
			const header = fields.map((field) => bookExportFieldLabels[field]);
			const separator = fields.map(() => "---");
			const body = rows.map((row) =>
				fields
					.map((field) => (row[field] ?? "").replace(/\|/g, "\\|"))
					.join(" | "),
			);
			return [
				`| ${header.join(" | ")} |`,
				`| ${separator.join(" | ")} |`,
				...body.map((line) => `| ${line} |`),
			].join("\n");
		}
		case "html": {
			const head = fields
				.map((field) => `<th>${escapeHtml(bookExportFieldLabels[field])}</th>`)
				.join("");
			const body = rows
				.map(
					(row) =>
						`<tr>${fields.map((field) => `<td>${escapeHtml(row[field] ?? "")}</td>`).join("")}</tr>`,
				)
				.join("");
			return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BBRC book list</title></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
		}
		case "xml": {
			const itemsXml = rows
				.map((row) => {
					const fieldsXml = fields
						.map(
							(field) => `<${field}>${escapeXml(row[field] ?? "")}</${field}>`,
						)
						.join("");
					return `<book>${fieldsXml}</book>`;
				})
				.join("");
			return `<?xml version="1.0" encoding="UTF-8"?><books>${itemsXml}</books>`;
		}
		default:
			return "";
	}
}

export function downloadTextFile(
	filename: string,
	content: string,
	mime: string,
) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export const bookExportMimeTypes: Record<BookExportFormat, string> = {
	csv: "text/csv;charset=utf-8",
	json: "application/json;charset=utf-8",
	xml: "application/xml;charset=utf-8",
	txt: "text/plain;charset=utf-8",
	md: "text/markdown;charset=utf-8",
	html: "text/html;charset=utf-8",
};
