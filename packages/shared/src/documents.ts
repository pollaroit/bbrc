export const MAX_DOCS_PER_BOOK = 3;

export const DOCUMENT_FORMATS = {
	pdf: {
		mime: "application/pdf",
		extension: "pdf",
		label: "PDF",
	},
	docx: {
		mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		extension: "docx",
		label: "DOCX",
	},
	epub: {
		mime: "application/epub+zip",
		extension: "epub",
		label: "EPUB",
	},
} as const;

export type DocumentFormat = keyof typeof DOCUMENT_FORMATS;

export const DOCUMENT_FORMAT_IDS = Object.keys(
	DOCUMENT_FORMATS,
) as DocumentFormat[];

export const ALLOWED_DOCUMENT_MIMES = DOCUMENT_FORMAT_IDS.map(
	(id) => DOCUMENT_FORMATS[id].mime,
);

/** Value for a file input's `accept`: extensions first, since EPUB often has no MIME type. */
export const DOCUMENT_FILE_ACCEPT = [
	...DOCUMENT_FORMAT_IDS.map((id) => `.${DOCUMENT_FORMATS[id].extension}`),
	...ALLOWED_DOCUMENT_MIMES,
].join(",");

export const DOCUMENT_FORMATS_LABEL = "PDF, DOCX or EPUB";

export function documentFormatFromMime(
	mime: string | null | undefined,
): DocumentFormat | null {
	const type = mime?.split(";")[0]?.trim().toLowerCase();
	if (!type) {
		return null;
	}
	return (
		DOCUMENT_FORMAT_IDS.find((id) => DOCUMENT_FORMATS[id].mime === type) ?? null
	);
}

export function documentFormatFromFilename(
	name: string | null | undefined,
): DocumentFormat | null {
	const extension = name?.split("?")[0]?.split(".").pop()?.trim().toLowerCase();
	if (!extension) {
		return null;
	}
	return (
		DOCUMENT_FORMAT_IDS.find(
			(id) => DOCUMENT_FORMATS[id].extension === extension,
		) ?? null
	);
}

/**
 * Format of an uploaded file. The extension wins over the browser-reported
 * MIME type, which is empty or generic for EPUB on several systems.
 */
export function resolveDocumentFormat(file: {
	type?: string | null;
	name?: string | null;
}): DocumentFormat | null {
	return (
		documentFormatFromFilename(file.name) ?? documentFormatFromMime(file.type)
	);
}

export function documentFormatLabel(url: string | null | undefined): string {
	const format = documentFormatFromFilename(url);
	return format ? DOCUMENT_FORMATS[format].label : "file";
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_LANGUAGE_CODES = ["en", "tr", "az", "ru"] as const;

export type DocumentLanguageCode = (typeof DOCUMENT_LANGUAGE_CODES)[number];

export const DOCUMENT_LANGUAGE_LABELS: Record<DocumentLanguageCode, string> = {
	en: "English",
	tr: "Turkish",
	az: "Azerbaijani",
	ru: "Russian",
};

export function documentLanguageLabel(code: string): string {
	if (code in DOCUMENT_LANGUAGE_LABELS) {
		return DOCUMENT_LANGUAGE_LABELS[code as DocumentLanguageCode];
	}
	return code;
}

export function isDocumentLanguageCode(
	value: string,
): value is DocumentLanguageCode {
	return (DOCUMENT_LANGUAGE_CODES as readonly string[]).includes(value);
}
