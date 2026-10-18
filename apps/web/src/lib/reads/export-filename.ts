import type { BookExportFilenameMode } from "@/lib/books/export-filename";
import {
	formatExportDateStamp,
	formatExportDateTimeStamp,
} from "@/lib/books/export-filename";

export type UserReadExportFormat =
	| "csv"
	| "json"
	| "xml"
	| "txt"
	| "md"
	| "html"
	| "goodreads-csv";

const formatExtensions: Record<UserReadExportFormat, string> = {
	csv: "csv",
	json: "json",
	xml: "xml",
	txt: "txt",
	md: "md",
	html: "html",
	"goodreads-csv": "csv",
};

export function buildUserReadExportFilename(input: {
	mode: BookExportFilenameMode;
	format: UserReadExportFormat;
	customBaseName?: string;
	now?: Date;
}): string {
	const now = input.now ?? new Date();
	const extension = formatExtensions[input.format];

	let base: string;

	switch (input.mode) {
		case "date":
			base =
				input.format === "goodreads-csv"
					? `${formatExportDateStamp(now)}-goodreads_library_export`
					: `${formatExportDateStamp(now)}-bbrcreads`;
			break;
		case "dateTime":
			base =
				input.format === "goodreads-csv"
					? `${formatExportDateTimeStamp(now)}-goodreads_library_export`
					: `${formatExportDateTimeStamp(now)}-bbrcreads`;
			break;
		case "custom": {
			const trimmed = input.customBaseName?.trim().replace(/[^\w.-]+/g, "-");
			if (trimmed && trimmed.length > 0) {
				base = trimmed;
			} else if (input.format === "goodreads-csv") {
				base = "goodreads_library_export";
			} else {
				base = "bbrcreads";
			}
			break;
		}
		default:
			base =
				input.format === "goodreads-csv"
					? "goodreads_library_export"
					: "bbrcreads";
	}

	return `${base}.${extension}`;
}
