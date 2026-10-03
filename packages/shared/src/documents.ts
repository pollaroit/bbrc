export const MAX_DOCS_PER_BOOK = 3;

export const ALLOWED_DOCUMENT_MIME = "application/pdf" as const;

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
