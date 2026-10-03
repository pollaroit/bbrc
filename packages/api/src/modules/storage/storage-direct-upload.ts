import {
	ALLOWED_IMAGE_MIME_TYPES,
	type AllowedImageMimeType,
	MAX_IMAGE_SIZE,
} from "@bbrc/storage";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import type { Context } from "../../context";
import {
	uploadAvatarDirect,
	uploadCommentImageDirect,
	uploadPostImageDirect,
	uploadShelfCoverDirect,
} from "./storage-image.service";

const DirectUploadTargetSchema = z.discriminatedUnion("target", [
	z.object({ target: z.literal("avatar") }),
	z.object({
		target: z.literal("post-image"),
		postSlug: z.string().min(1),
	}),
	z.object({
		target: z.literal("comment-image"),
		commentSlug: z.string().min(1),
	}),
	z.object({
		target: z.literal("shelf-cover"),
		shelfSlug: z.string().min(3).max(60),
	}),
]);

export type DirectUploadTarget = z.infer<typeof DirectUploadTargetSchema>;

function parseImageMime(value: string): AllowedImageMimeType | null {
	return ALLOWED_IMAGE_MIME_TYPES.includes(value as AllowedImageMimeType)
		? (value as AllowedImageMimeType)
		: null;
}

function mapOrpcError(error: unknown): Response {
	if (error instanceof ORPCError) {
		const status =
			error.code === "UNAUTHORIZED"
				? 401
				: error.code === "FORBIDDEN"
					? 403
					: error.code === "NOT_FOUND"
						? 404
						: error.code === "PRECONDITION_FAILED"
							? 503
							: 400;
		return Response.json({ error: error.message }, { status });
	}

	console.error(error);
	return Response.json({ error: "Upload failed" }, { status: 500 });
}

export async function handleDirectImageUpload(
	context: Context,
	input: DirectUploadTarget,
	file: File,
): Promise<Response> {
	const session = context.session;
	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const contentType = parseImageMime(file.type);
	if (!contentType) {
		return Response.json({ error: "Use JPEG, PNG, or WebP." }, { status: 400 });
	}

	if (file.size > MAX_IMAGE_SIZE) {
		return Response.json(
			{ error: "Image must be 2 MB or smaller." },
			{ status: 400 },
		);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const payload = {
		buffer,
		contentType,
		contentLength: buffer.length,
	};

	try {
		let result: { publicUrl: string };

		switch (input.target) {
			case "avatar":
				result = await uploadAvatarDirect(
					payload,
					session,
					context.db,
					context,
				);
				break;
			case "post-image":
				result = await uploadPostImageDirect(
					input.postSlug,
					payload,
					session,
					context.db,
					context,
				);
				break;
			case "comment-image":
				result = await uploadCommentImageDirect(
					input.commentSlug,
					payload,
					session,
					context.db,
					context,
				);
				break;
			case "shelf-cover":
				result = await uploadShelfCoverDirect(
					input.shelfSlug,
					payload,
					session,
					context.db,
					context,
				);
				break;
		}

		return Response.json(result);
	} catch (error) {
		return mapOrpcError(error);
	}
}

export function parseDirectUploadTarget(
	formData: FormData,
): DirectUploadTarget | null {
	const target = formData.get("target");
	if (typeof target !== "string") {
		return null;
	}

	const fields: Record<string, string> = { target };
	for (const key of ["postSlug", "commentSlug", "shelfSlug"] as const) {
		const value = formData.get(key);
		if (typeof value === "string" && value.length > 0) {
			fields[key] = value;
		}
	}

	const parsed = DirectUploadTargetSchema.safeParse(fields);
	return parsed.success ? parsed.data : null;
}
