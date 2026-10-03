export type BookExportFilenameMode = "date" | "dateTime" | "none" | "custom";

export type BookExportFormat = "csv" | "json" | "xml" | "txt" | "md" | "html";

const formatExtensions: Record<BookExportFormat, string> = {
	csv: "csv",
	json: "json",
	xml: "xml",
	txt: "txt",
	md: "md",
	html: "html",
};

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

export function formatExportDateStamp(date: Date): string {
	return [
		pad2(date.getDate()),
		pad2(date.getMonth() + 1),
		date.getFullYear(),
	].join("-");
}

export function formatExportDateTimeStamp(date: Date): string {
	return `${formatExportDateStamp(date)}-${pad2(date.getHours())}-${pad2(date.getMinutes())}`;
}

export function buildBookExportFilename(input: {
	mode: BookExportFilenameMode;
	format: BookExportFormat;
	customBaseName?: string;
	now?: Date;
}): string {
	const now = input.now ?? new Date();
	const extension = formatExtensions[input.format];

	let base: string;

	switch (input.mode) {
		case "date":
			base = `${formatExportDateStamp(now)}-bbrclist`;
			break;
		case "dateTime":
			base = `${formatExportDateTimeStamp(now)}-bbrclist`;
			break;
		case "custom": {
			const trimmed = input.customBaseName?.trim().replace(/[^\w.-]+/g, "-");
			base = trimmed && trimmed.length > 0 ? trimmed : "bbrclist";
			break;
		}
		default:
			base = "bbrclist";
	}

	return `${base}.${extension}`;
}
