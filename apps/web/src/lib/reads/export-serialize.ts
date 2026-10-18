import type {
	ExportUserReadsOutput,
	UserReadExportFieldKey,
} from "@bbrc/api/modules/read/read-export.schema";
import {
	bookExportMimeTypes,
	downloadTextFile,
} from "@/lib/books/export-serialize";
import { userReadExportFieldLabels } from "@/lib/reads/export-fields";
import type { UserReadExportFormat } from "@/lib/reads/export-filename";

export { downloadTextFile };

type ExportRow = ExportUserReadsOutput["items"][number];

/** Goodreads library export column order (2022+). */
export const goodreadsLibraryExportColumns = [
	"Book Id",
	"Title",
	"Author",
	"Author l-f",
	"Additional Authors",
	"ISBN",
	"ISBN13",
	"My Rating",
	"Average Rating",
	"Publisher",
	"Binding",
	"Number of Pages",
	"Year Published",
	"Original Publication Year",
	"Date Read",
	"Date Added",
	"Bookshelves",
	"Bookshelves with positions",
	"Exclusive Shelf",
	"My Review",
	"Spoiler",
	"Private Notes",
	"Read Count",
	"Owned Copies",
] as const;

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

function floorRating(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "";
	}

	return (Math.floor(value * 10) / 10).toFixed(1);
}

function formatGoodreadsDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}/${month}/${day}`;
}

function formatGoodreadsDateRead(row: ExportRow): string {
	if (row.readEndYear != null && row.readEndMonth != null) {
		const month = String(row.readEndMonth).padStart(2, "0");
		return `${row.readEndYear}/${month}/01`;
	}

	if (row.readEndYear != null) {
		return `${row.readEndYear}/01/01`;
	}

	return formatGoodreadsDate(row.recordedAt);
}

function formatGoodreadsMyRating(rating: number | null): string {
	if (rating == null || rating <= 0) {
		return "0";
	}

	return String(Math.round(rating));
}

function primaryAuthor(authors: string[]): string {
	return authors[0]?.trim() ?? "";
}

function additionalAuthors(authors: string[]): string {
	if (authors.length <= 1) {
		return "";
	}

	return authors.slice(1).join(", ");
}

function formatIsbnForGoodreads(isbn: string | null): string {
	if (!isbn) {
		return "";
	}

	// Matches common Goodreads CSV Excel-safe ISBN cells.
	return `="${isbn}"`;
}

function formatCell(field: UserReadExportFieldKey, row: ExportRow): string {
	switch (field) {
		case "title":
			return row.title;
		case "authors":
			return row.authors.join(", ");
		case "slug":
			return row.slug;
		case "olid":
			return row.olid;
		case "status":
			return row.status.charAt(0).toUpperCase() + row.status.slice(1);
		case "pages":
			return String(row.pages);
		case "publishedIn":
			return String(row.publishedIn);
		case "averageRating":
			return floorRating(row.averageRating);
		case "openLibraryRating":
			return floorRating(row.openLibraryRating);
		case "readEndYear":
			return row.readEndYear != null ? String(row.readEndYear) : "";
		case "readEndMonth":
			return row.readEndMonth != null ? String(row.readEndMonth) : "";
		case "editionId":
			return row.editionId ?? "";
		case "recordedAt":
			return row.recordedAt.toISOString();
		case "myRating":
			return row.myRating != null ? String(row.myRating) : "";
		case "myReview":
			return row.myReview ?? "";
		case "isSpoiler":
			return row.isSpoiler ? "true" : "false";
		case "isbn13":
			return row.isbn13 ?? "";
		case "isbn10":
			return row.isbn10 ?? "";
		case "publisher":
			return row.publisher ?? "";
		case "binding":
			return row.binding ?? "";
		default:
			return "";
	}
}

function pickRows(
	items: ExportRow[],
	fields: UserReadExportFieldKey[],
): Record<string, string>[] {
	return items.map((row) => {
		const record: Record<string, string> = {};

		for (const field of fields) {
			record[field] = formatCell(field, row);
		}

		return record;
	});
}

function goodreadsRow(row: ExportRow): string[] {
	const average = row.averageRating ?? row.openLibraryRating ?? null;

	return [
		"",
		row.title,
		primaryAuthor(row.authors),
		"",
		additionalAuthors(row.authors),
		formatIsbnForGoodreads(row.isbn10),
		formatIsbnForGoodreads(row.isbn13),
		formatGoodreadsMyRating(row.myRating),
		floorRating(average),
		row.publisher ?? "",
		row.binding ?? "",
		row.pages > 0 ? String(row.pages) : "",
		row.publishedIn > 0 ? String(row.publishedIn) : "",
		row.publishedIn > 0 ? String(row.publishedIn) : "",
		formatGoodreadsDateRead(row),
		formatGoodreadsDate(row.recordedAt),
		"",
		"",
		"read",
		row.myReview ?? "",
		row.isSpoiler ? "true" : "false",
		"",
		"1",
		"0",
	];
}

export function serializeGoodreadsLibraryExport(items: ExportRow[]): string {
	const header = goodreadsLibraryExportColumns.map((column) =>
		escapeCsv(column),
	);
	const lines = items.map((row) =>
		goodreadsRow(row)
			.map((cell) => escapeCsv(cell))
			.join(","),
	);
	return [header.join(","), ...lines].join("\n");
}

export function serializeUserReadExport(
	format: UserReadExportFormat,
	items: ExportRow[],
	fields: UserReadExportFieldKey[],
): string {
	if (format === "goodreads-csv") {
		return serializeGoodreadsLibraryExport(items);
	}

	const rows = pickRows(items, fields);

	switch (format) {
		case "json":
			return `${JSON.stringify(rows, null, 2)}\n`;
		case "csv": {
			const header = fields.map((field) =>
				escapeCsv(userReadExportFieldLabels[field]),
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
			const header = fields.map((field) => userReadExportFieldLabels[field]);
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
				.map(
					(field) => `<th>${escapeHtml(userReadExportFieldLabels[field])}</th>`,
				)
				.join("");
			const body = rows
				.map(
					(row) =>
						`<tr>${fields.map((field) => `<td>${escapeHtml(row[field] ?? "")}</td>`).join("")}</tr>`,
				)
				.join("");
			return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BBRC reads export</title></head><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
		}
		case "xml": {
			const itemsXml = rows
				.map((row) => {
					const fieldsXml = fields
						.map(
							(field) => `<${field}>${escapeXml(row[field] ?? "")}</${field}>`,
						)
						.join("");
					return `<read>${fieldsXml}</read>`;
				})
				.join("");
			return `<?xml version="1.0" encoding="UTF-8"?><reads>${itemsXml}</reads>`;
		}
		default:
			return "";
	}
}

export const userReadExportMimeTypes: Record<UserReadExportFormat, string> = {
	...bookExportMimeTypes,
	"goodreads-csv": "text/csv;charset=utf-8",
};
