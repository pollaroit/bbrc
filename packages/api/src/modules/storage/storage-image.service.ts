import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import {
	type AllowedImageMimeType,
	buildObjectKey,
	buildPublicObjectUrl,
	createR2Client,
	getStorageEnv,
	headObject,
	loadR2ConfigFromEnv,
	MAX_IMAGE_SIZE,
	putObjectBuffer,
} from "@bbrc/storage";
import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import type { Context } from "../../context";
import {
	revalidateCommentIsr,
	revalidatePostIsr,
	revalidateUserIsr,
	revalidateUserShelvesIsr,
} from "../../revalidate-isr";
import { loadShelfAccess, requireShelfPermission } from "../shelf/shelf-access";
import type { ImageUploadBodySchema } from "./storage-image.schema";
import { tryDeleteR2PublicUrl } from "./storage-r2-cleanup";

type ImageUploadBody = z.infer<typeof ImageUploadBodySchema>;

function requireR2() {
	const config = loadR2ConfigFromEnv();
	if (!config) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Object storage is not configured",
		});
	}
	return { config, client: createR2Client(config) };
}

function avatarPublicUrlWithCacheBust(stableUrl: string): string {
	const url = new URL(stableUrl);
	url.searchParams.set("v", String(Date.now()));
	return url.toString();
}

async function verifyUploadedObject(
	key: string,
	body: ImageUploadBody,
): Promise<string> {
	const { config, client } = requireR2();
	const head = await headObject(client, config, key);

	if (!head) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Upload not found; complete the upload to storage first",
		});
	}

	if (head.contentLength !== body.contentLength) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded size does not match",
		});
	}

	const headType = head.contentType?.split(";")[0]?.trim();
	if (headType && headType !== body.contentType) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Uploaded content type does not match",
		});
	}

	if (head.contentLength > MAX_IMAGE_SIZE) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File exceeds maximum size",
		});
	}

	return buildPublicObjectUrl(config, key);
}

async function prepareImageUploadInit(key: string, body: ImageUploadBody) {
	if (body.contentLength > MAX_IMAGE_SIZE) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File exceeds maximum size",
		});
	}

	const { config } = requireR2();

	return {
		key,
		publicUrl: buildPublicObjectUrl(config, key),
		maxSize: MAX_IMAGE_SIZE,
	};
}

export async function putImageAtKey(
	key: string,
	body: ImageUploadBody,
	buffer: Buffer,
): Promise<string> {
	const { config, client } = requireR2();
	await putObjectBuffer(client, config, {
		key,
		body: buffer,
		contentType: body.contentType,
	});
	return verifyUploadedObject(key, body);
}

export async function uploadPostImageDirect(
	postSlug: string,
	file: {
		buffer: Buffer;
		contentType: AllowedImageMimeType;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
) {
	const post = await loadOwnedPostForUpload(postSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "post-image",
		postSlug,
	});
	const body: ImageUploadBody = {
		contentType: file.contentType,
		contentLength: file.contentLength,
	};
	const publicUrl = await putImageAtKey(key, body, file.buffer);

	await db.post.update({
		where: { id: post.id },
		data: { imageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(post.imageUrl);
	revalidatePostIsr(context, postSlug);

	return { publicUrl };
}

export async function uploadCommentImageDirect(
	commentSlug: string,
	file: {
		buffer: Buffer;
		contentType: AllowedImageMimeType;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
) {
	const comment = await loadOwnedComment(commentSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "comment-image",
		commentSlug,
	});
	const body: ImageUploadBody = {
		contentType: file.contentType,
		contentLength: file.contentLength,
	};
	const publicUrl = await putImageAtKey(key, body, file.buffer);

	await db.comment.update({
		where: { id: comment.id },
		data: { imageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(comment.imageUrl);
	await revalidateCommentIsr(context, db, comment.slug);

	return { publicUrl };
}

export async function uploadAvatarDirect(
	file: {
		buffer: Buffer;
		contentType: AllowedImageMimeType;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
) {
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "avatar",
		username: session.user.username,
	});
	const body: ImageUploadBody = {
		contentType: file.contentType,
		contentLength: file.contentLength,
	};
	const stableUrl = await putImageAtKey(key, body, file.buffer);
	const publicUrl = avatarPublicUrlWithCacheBust(stableUrl);

	const previous = await db.user.findUnique({
		where: { id: session.user.id },
		select: { image: true },
	});

	await db.user.update({
		where: { id: session.user.id },
		data: { image: publicUrl },
	});

	await tryDeleteR2PublicUrl(previous?.image);
	revalidateUserIsr(context, session.user.username);

	return { publicUrl };
}

export async function uploadShelfCoverDirect(
	shelfSlug: string,
	ownerUsername: string | undefined,
	file: {
		buffer: Buffer;
		contentType: AllowedImageMimeType;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
) {
	const shelf = await loadCoverEditableShelf(
		shelfSlug,
		ownerUsername,
		session.user.id,
		db,
	);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "shelf-cover",
		username: shelf.user.username,
		shelfSlug: shelf.slug,
	});
	const body: ImageUploadBody = {
		contentType: file.contentType,
		contentLength: file.contentLength,
	};
	const publicUrl = await putImageAtKey(key, body, file.buffer);

	await db.shelf.update({
		where: { id: shelf.id },
		data: { coverImageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(shelf.coverImageUrl);
	revalidateUserShelvesIsr(context, shelf.user.username, shelf.slug);

	return { publicUrl };
}

export async function initAvatarUpload(
	body: ImageUploadBody,
	session: Session,
) {
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "avatar",
		username: session.user.username,
	});
	return prepareImageUploadInit(key, body);
}

export async function commitAvatarUpload(
	body: ImageUploadBody,
	session: Session,
	db: Database,
	context: Context,
) {
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "avatar",
		username: session.user.username,
	});
	const stableUrl = await verifyUploadedObject(key, body);
	const publicUrl = avatarPublicUrlWithCacheBust(stableUrl);

	const previous = await db.user.findUnique({
		where: { id: session.user.id },
		select: { image: true },
	});

	await db.user.update({
		where: { id: session.user.id },
		data: { image: publicUrl },
	});

	await tryDeleteR2PublicUrl(previous?.image);
	revalidateUserIsr(context, session.user.username);

	return { publicUrl };
}

export async function clearAvatarUpload(
	session: Session,
	db: Database,
	context: Context,
) {
	const previous = await db.user.findUnique({
		where: { id: session.user.id },
		select: { image: true },
	});

	await db.user.update({
		where: { id: session.user.id },
		data: { image: null },
	});

	await tryDeleteR2PublicUrl(previous?.image);
	revalidateUserIsr(context, session.user.username);

	return { cleared: true as const };
}

/** Posts with a poll carry no image, so uploads for them are refused. */
async function loadOwnedPostForUpload(
	slug: string,
	userId: string,
	db: Database,
) {
	const post = await loadOwnedPost(slug, userId, db);
	const poll = await db.postPoll.findFirst({
		where: { postId: post.id },
		select: { id: true },
	});
	if (poll) {
		throw new ORPCError("BAD_REQUEST", {
			message: "A post with a poll cannot have an image.",
		});
	}
	return post;
}

async function loadOwnedPost(slug: string, userId: string, db: Database) {
	const post = await db.post.findUnique({
		where: { slug },
		select: { id: true, slug: true, authorId: true, imageUrl: true },
	});
	if (!post) {
		throw new ORPCError("NOT_FOUND", { message: "Post not found" });
	}
	if (post.authorId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the author can change this post image",
		});
	}
	return post;
}

async function loadOwnedComment(slug: string, userId: string, db: Database) {
	const comment = await db.comment.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			authorId: true,
			imageUrl: true,
			post: { select: { slug: true } },
			feedback: { select: { slug: true, book: { select: { slug: true } } } },
		},
	});
	if (!comment) {
		throw new ORPCError("NOT_FOUND", { message: "Comment not found" });
	}
	if (comment.authorId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the author can change this comment image",
		});
	}
	return comment;
}

/** The shelf, once the member is known to be allowed to change its cover. */
async function loadCoverEditableShelf(
	shelfSlug: string,
	ownerUsername: string | undefined,
	userId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, {
		ownerUsername,
		shelfSlug,
		actorId: userId,
	});
	requireShelfPermission(access, "edit_cover");
	return {
		id: access.shelf.id,
		slug: access.shelf.slug,
		userId: access.shelf.userId,
		coverImageUrl: access.shelf.coverImageUrl,
		user: { username: access.owner.username },
	};
}

export async function initPostImageUpload(
	postSlug: string,
	body: ImageUploadBody,
	session: Session,
	db: Database,
) {
	await loadOwnedPostForUpload(postSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "post-image",
		postSlug,
	});
	return prepareImageUploadInit(key, body);
}

export async function commitPostImageUpload(
	postSlug: string,
	body: ImageUploadBody,
	session: Session,
	db: Database,
	context: Context,
) {
	const post = await loadOwnedPostForUpload(postSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "post-image",
		postSlug,
	});
	const publicUrl = await verifyUploadedObject(key, body);

	await db.post.update({
		where: { id: post.id },
		data: { imageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(post.imageUrl);
	revalidatePostIsr(context, postSlug);

	return { publicUrl };
}

export async function removePostImage(
	postSlug: string,
	session: Session,
	db: Database,
	context: Context,
) {
	const post = await loadOwnedPost(postSlug, session.user.id, db);

	await db.post.update({
		where: { id: post.id },
		data: { imageUrl: null },
	});

	await tryDeleteR2PublicUrl(post.imageUrl);
	revalidatePostIsr(context, postSlug);

	return { removed: true as const };
}

export async function initCommentImageUpload(
	commentSlug: string,
	body: ImageUploadBody,
	session: Session,
	db: Database,
) {
	await loadOwnedComment(commentSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "comment-image",
		commentSlug,
	});
	return prepareImageUploadInit(key, body);
}

export async function commitCommentImageUpload(
	commentSlug: string,
	body: ImageUploadBody,
	session: Session,
	db: Database,
	context: Context,
) {
	const comment = await loadOwnedComment(commentSlug, session.user.id, db);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "comment-image",
		commentSlug,
	});
	const publicUrl = await verifyUploadedObject(key, body);

	await db.comment.update({
		where: { id: comment.id },
		data: { imageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(comment.imageUrl);
	await revalidateCommentIsr(context, db, comment.slug);

	return { publicUrl };
}

export async function removeCommentImage(
	commentSlug: string,
	session: Session,
	db: Database,
	context: Context,
) {
	const comment = await loadOwnedComment(commentSlug, session.user.id, db);

	await db.comment.update({
		where: { id: comment.id },
		data: { imageUrl: null },
	});

	await tryDeleteR2PublicUrl(comment.imageUrl);
	await revalidateCommentIsr(context, db, comment.slug);

	return { removed: true as const };
}

export async function initShelfCoverUpload(
	shelfSlug: string,
	ownerUsername: string | undefined,
	body: ImageUploadBody,
	session: Session,
	db: Database,
) {
	const shelf = await loadCoverEditableShelf(
		shelfSlug,
		ownerUsername,
		session.user.id,
		db,
	);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "shelf-cover",
		username: shelf.user.username,
		shelfSlug: shelf.slug,
	});
	return prepareImageUploadInit(key, body);
}

export async function commitShelfCoverUpload(
	shelfSlug: string,
	ownerUsername: string | undefined,
	body: ImageUploadBody,
	session: Session,
	db: Database,
	context: Context,
) {
	const shelf = await loadCoverEditableShelf(
		shelfSlug,
		ownerUsername,
		session.user.id,
		db,
	);
	const storageEnv = getStorageEnv();
	const key = buildObjectKey(storageEnv, {
		kind: "shelf-cover",
		username: shelf.user.username,
		shelfSlug: shelf.slug,
	});
	const publicUrl = await verifyUploadedObject(key, body);

	await db.shelf.update({
		where: { id: shelf.id },
		data: { coverImageUrl: publicUrl },
	});

	await tryDeleteR2PublicUrl(shelf.coverImageUrl);
	revalidateUserShelvesIsr(context, shelf.user.username, shelf.slug);

	return { publicUrl };
}

export async function removeShelfCoverUpload(
	shelfSlug: string,
	ownerUsername: string | undefined,
	session: Session,
	db: Database,
	context: Context,
) {
	const shelf = await loadCoverEditableShelf(
		shelfSlug,
		ownerUsername,
		session.user.id,
		db,
	);

	await db.shelf.update({
		where: { id: shelf.id },
		data: { coverImageUrl: null },
	});

	await tryDeleteR2PublicUrl(shelf.coverImageUrl);
	revalidateUserShelvesIsr(context, shelf.user.username, shelf.slug);

	return { removed: true as const };
}
