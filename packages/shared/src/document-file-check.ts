import type { DocumentFormat } from "./documents";

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function latin1(bytes: Uint8Array): string {
	return new TextDecoder("latin1").decode(bytes);
}

function startsWith(buffer: Uint8Array, bytes: number[]): boolean {
	return bytes.every((byte, index) => buffer[index] === byte);
}

/**
 * Cheap content check so a renamed file can't pass as another format:
 * PDFs carry a `%PDF-` header, DOCX and EPUB are ZIP archives with a
 * format-specific marker (EPUB stores its `mimetype` entry first).
 */
export function fileMatchesDocumentFormat(
	buffer: Uint8Array,
	format: DocumentFormat,
): boolean {
	switch (format) {
		case "pdf":
			return latin1(buffer.subarray(0, 1024)).includes("%PDF-");
		case "docx": {
			if (!startsWith(buffer, ZIP_SIGNATURE)) {
				return false;
			}
			const text = latin1(buffer);
			return text.includes("[Content_Types].xml") && text.includes("word/");
		}
		case "epub":
			return (
				startsWith(buffer, ZIP_SIGNATURE) &&
				latin1(buffer.subarray(0, 256)).includes("application/epub+zip")
			);
		default: {
			const _exhaustive: never = format;
			return _exhaustive;
		}
	}
}
