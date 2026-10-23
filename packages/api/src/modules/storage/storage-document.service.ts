import { DOCUMENT_FORMATS, documentFormatFromMime } from "@bbrc/shared";
import {
	ALLOWED_DOCUMENT_MIME_TYPES,
	type AllowedDocumentMimeType,
	buildObjectKey,
	buildPublicObjectUrl,
	createR2Client,
	type DocumentFileExtension,
	getStorageEnv,
	headObject,
	loadR2ConfigFromEnv,
	MAX_DOCUMENT_SIZE,
	putObjectBuffer,
} from "@bbrc/storage";
import { ORPCError } from "@orpc/server";

import { tryDeleteR2PublicUrl } from "./storage-r2-cleanup";

function requireR2() {
	const config = loadR2ConfigFromEnv();
	if (!config) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Object storage is not configured",
		});
	}
	return { config, client: createR2Client(config) };
}

export function parseDocumentMime(
	value: string,
): AllowedDocumentMimeType | null {
	return ALLOWED_DOCUMENT_MIME_TYPES.includes(value as AllowedDocumentMimeType)
		? (value as AllowedDocumentMimeType)
		: null;
}

async function verifyDocumentAtKey(
	key: string,
	contentType: AllowedDocumentMimeType,
	contentLength: number,
): Promise<string> {
	const { config, client } = requireR2();
	const head = await headObject(client, config, key);

	if (!head) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Upload not found; complete the upload to storage first",
		});
	}

	if (head.contentLength !== contentLength) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded size does not match",
		});
	}

	const headType = head.contentType?.split(";")[0]?.trim();
	if (headType && headType !== contentType) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded content type does not match",
		});
	}

	if (head.contentLength > MAX_DOCUMENT_SIZE) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File exceeds maximum size",
		});
	}

	return buildPublicObjectUrl(config, key);
}

export async function putDocumentAtKey(
	bookSlug: string,
	documentSlug: string,
	file: {
		buffer: Buffer;
		contentType: AllowedDocumentMimeType;
		contentLength: number;
	},
): Promise<string> {
	const format = documentFormatFromMime(file.contentType);
	if (!format) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only PDF, DOCX and EPUB files are allowed",
		});
	}
	const extension: DocumentFileExtension = DOCUMENT_FORMATS[format].extension;

	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "book-document",
		bookSlug,
		documentSlug,
		extension,
	});

	const { config, client } = requireR2();
	await putObjectBuffer(client, config, {
		key,
		body: file.buffer,
		contentType: file.contentType,
	});

	return verifyDocumentAtKey(key, file.contentType, file.contentLength);
}

export async function deleteDocumentObject(
	documentUrl: string | null | undefined,
) {
	await tryDeleteR2PublicUrl(documentUrl);
}
