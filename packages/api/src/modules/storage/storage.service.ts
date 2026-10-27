import type { Session } from "@bbrc/auth";
import { DOCUMENT_FORMATS, documentFormatFromMime } from "@bbrc/shared";
import {
	buildObjectKey,
	buildPublicObjectUrl,
	createR2Client,
	DOCUMENT_KEY_EXTENSION_PATTERN,
	deleteObject,
	getStorageEnv,
	headObject,
	isR2Configured,
	loadR2ConfigFromEnv,
	MAX_DOCUMENT_SIZE,
	MAX_IMAGE_SIZE,
	type ObjectKeyParams,
} from "@bbrc/storage";
import { ORPCError } from "@orpc/server";
import { appError } from "../../lib/app-error";
import type { CommitUploadInput, InitUploadInput } from "./storage.schema";

function storageUnavailable(): never {
	throw appError("PRECONDITION_FAILED", "storage.notConfigured");
}

function getR2Context() {
	const config = loadR2ConfigFromEnv();
	if (!config) {
		storageUnavailable();
	}
	const client = createR2Client(config);
	return { config, client };
}

function maxSizeForKind(kind: ObjectKeyParams["kind"]): number {
	return kind === "book-document" ? MAX_DOCUMENT_SIZE : MAX_IMAGE_SIZE;
}

function toObjectKeyParams(
	input: InitUploadInput,
	username: string,
): ObjectKeyParams {
	switch (input.kind) {
		case "avatar":
			return { kind: "avatar", username };
		case "post-image":
			return { kind: "post-image", postSlug: input.postSlug };
		case "comment-image":
			return { kind: "comment-image", commentSlug: input.commentSlug };
		case "shelf-cover":
			return {
				kind: "shelf-cover",
				username,
				shelfSlug: input.shelfSlug,
			};
		case "book-document": {
			const format = documentFormatFromMime(input.contentType);
			if (!format) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Only PDF, DOCX and EPUB files are allowed",
				});
			}
			return {
				kind: "book-document",
				bookSlug: input.bookSlug,
				documentSlug: input.documentSlug,
				extension: DOCUMENT_FORMATS[format].extension,
			};
		}
		default: {
			const _exhaustive: never = input;
			return _exhaustive;
		}
	}
}

function assertInitUploadAllowed(
	input: InitUploadInput,
	session: Session,
): void {
	const user = session.user;

	switch (input.kind) {
		case "avatar":
		case "shelf-cover":
		case "post-image":
		case "comment-image":
			return;
		case "book-document":
			if (!user.isAdmin) {
				throw new ORPCError("FORBIDDEN", {
					message: "Document upload is not enabled yet",
				});
			}
			return;
		default: {
			const _exhaustive: never = input;
			throw new Error(`Unexpected upload kind: ${String(_exhaustive)}`);
		}
	}
}

function assertKeyAllowedForSession(key: string, session: Session): void {
	const storageEnv = getStorageEnv();
	if (!key.startsWith(`${storageEnv}/`)) {
		throw appError("BAD_REQUEST", "storage.invalidKey");
	}

	const user = session.user;
	const username = user.username;

	const avatarPrefix = `${storageEnv}/users/${username}/`;
	if (key === `${storageEnv}/users/${username}/avatar.jpg`) {
		return;
	}

	const shelfCoverPattern = new RegExp(
		`^${storageEnv}/users/${escapeRegExp(username)}/shelves/([a-z0-9_]+)/image\\.png$`,
	);
	if (shelfCoverPattern.test(key)) {
		return;
	}

	if (user.isAdmin) {
		const adminAllowed =
			new RegExp(`^${storageEnv}/posts/[a-z0-9_]+/image\\.png$`).test(key) ||
			new RegExp(`^${storageEnv}/comments/[a-z0-9_]+/image\\.png$`).test(key) ||
			new RegExp(
				`^${storageEnv}/books/[a-z0-9_]+/documents/[a-z0-9_]+\\.(pdf|docx|epub)$`,
			).test(key);
		if (adminAllowed) {
			return;
		}
	}

	if (key.startsWith(avatarPrefix)) {
		throw appError("FORBIDDEN", "storage.forbiddenKey");
	}

	throw appError("FORBIDDEN", "storage.forbiddenKey");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getStorageStatus() {
	return {
		configured: isR2Configured(),
		env: getStorageEnv(),
	};
}

export async function initUpload(input: InitUploadInput, session: Session) {
	assertInitUploadAllowed(input, session);

	const { config } = getR2Context();
	const storageEnv = getStorageEnv();
	const username = session.user.username;
	const keyParams = toObjectKeyParams(input, username);
	const key = buildObjectKey(storageEnv, keyParams);
	const maxSize = maxSizeForKind(keyParams.kind);

	if (input.contentLength > maxSize) {
		throw appError("BAD_REQUEST", "storage.fileTooLarge");
	}

	return {
		key,
		publicUrl: buildPublicObjectUrl(config, key),
		maxSize,
	};
}

export async function commitUpload(input: CommitUploadInput, session: Session) {
	assertKeyAllowedForSession(input.key, session);

	const { config, client } = getR2Context();
	const head = await headObject(client, config, input.key);

	if (!head) {
		throw appError("BAD_REQUEST", "storage.uploadNotFound");
	}

	if (head.contentLength !== input.contentLength) {
		throw appError("BAD_REQUEST", "storage.sizeMismatch");
	}

	const headType = head.contentType?.split(";")[0]?.trim();
	const expectedType = input.contentType;
	if (headType && headType !== expectedType) {
		throw appError("BAD_REQUEST", "storage.typeMismatch");
	}

	const maxSize = DOCUMENT_KEY_EXTENSION_PATTERN.test(input.key)
		? MAX_DOCUMENT_SIZE
		: MAX_IMAGE_SIZE;
	if (head.contentLength > maxSize) {
		throw appError("BAD_REQUEST", "storage.fileTooLarge");
	}

	return {
		key: input.key,
		publicUrl: buildPublicObjectUrl(config, input.key),
		contentLength: head.contentLength,
		contentType: headType,
	};
}

export async function removeObject(key: string, session: Session) {
	assertKeyAllowedForSession(key, session);
	const { config, client } = getR2Context();
	await deleteObject(client, config, key);
	return { ok: true as const };
}

/** Admin smoke: delete by key (same auth as commit). */
