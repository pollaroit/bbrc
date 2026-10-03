import type { Session } from "@bbrc/auth";
import {
	buildObjectKey,
	buildPublicObjectUrl,
	createPresignedUpload,
	createR2Client,
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

import type { CommitUploadInput, InitUploadInput } from "./storage.schema";

function storageUnavailable(): never {
	throw new ORPCError("PRECONDITION_FAILED", {
		message: "Object storage is not configured",
	});
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
		case "book-document":
			return {
				kind: "book-document",
				bookSlug: input.bookSlug,
				documentSlug: input.documentSlug,
			};
		default: {
			const _exhaustive: never = input;
			return _exhaustive;
		}
	}
}

/** Phase 1: coarse auth until entity commit flows land in phases 2–3. */
function assertInitUploadAllowed(
	input: InitUploadInput,
	session: Session,
): void {
	const user = session.user;

	switch (input.kind) {
		case "avatar":
		case "shelf-cover":
			return;
		case "post-image":
		case "comment-image":
		case "book-document":
			if (!user.isAdmin) {
				throw new ORPCError("FORBIDDEN", {
					message: "Upload for this asset type is not enabled yet",
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
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid object key",
		});
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
				`^${storageEnv}/books/[a-z0-9_]+/documents/[a-z0-9_]+\\.pdf$`,
			).test(key);
		if (adminAllowed) {
			return;
		}
	}

	if (key.startsWith(avatarPrefix)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Cannot access this object key",
		});
	}

	throw new ORPCError("FORBIDDEN", {
		message: "Cannot access this object key",
	});
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

	const { config, client } = getR2Context();
	const storageEnv = getStorageEnv();
	const username = session.user.username;
	const keyParams = toObjectKeyParams(input, username);
	const key = buildObjectKey(storageEnv, keyParams);
	const maxSize = maxSizeForKind(keyParams.kind);

	if (input.contentLength > maxSize) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File exceeds maximum size",
		});
	}

	const presigned = await createPresignedUpload(client, config, {
		key,
		contentType: input.contentType,
		contentLength: input.contentLength,
	});

	return {
		url: presigned.url,
		key: presigned.key,
		publicUrl: buildPublicObjectUrl(config, presigned.key),
		maxSize,
		headers: presigned.headers,
	};
}

export async function commitUpload(input: CommitUploadInput, session: Session) {
	assertKeyAllowedForSession(input.key, session);

	const { config, client } = getR2Context();
	const head = await headObject(client, config, input.key);

	if (!head) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Upload not found; complete the upload to storage first",
		});
	}

	if (head.contentLength !== input.contentLength) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded size does not match",
		});
	}

	const headType = head.contentType?.split(";")[0]?.trim();
	const expectedType = input.contentType;
	if (headType && headType !== expectedType) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded content type does not match",
		});
	}

	const maxSize = input.key.endsWith(".pdf")
		? MAX_DOCUMENT_SIZE
		: MAX_IMAGE_SIZE;
	if (head.contentLength > maxSize) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File exceeds maximum size",
		});
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
