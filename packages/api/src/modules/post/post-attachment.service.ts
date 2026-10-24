import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { contentPlainText, formatSittingDisplayName } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	POST_ATTACHMENT_TRUNCATE,
	type PostAttachmentInput,
	type PostAttachmentOutput,
	postAttachedBookCardFields,
	postAttachmentSelect,
} from "./post-attachment.schema";

type PostAttachmentRow = Prisma.PostAttachmentGetPayload<{
	select: typeof postAttachmentSelect;
}>;

type LegacyBookRow = Prisma.BookGetPayload<{
	select: typeof postAttachedBookCardFields;
}> | null;

export function truncateAttachmentText(
	text: string,
	max = POST_ATTACHMENT_TRUNCATE,
): string {
	const trimmed = contentPlainText(text).trim();
	if (trimmed.length <= max) {
		return trimmed;
	}
	return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function mapAttachmentRow(row: PostAttachmentRow): PostAttachmentOutput {
	switch (row.kind) {
		case "book": {
			if (!row.book) {
				throw new Error("Book attachment missing book row");
			}
			return { kind: "book", book: row.book };
		}
		case "shelf": {
			if (!row.shelf) {
				throw new Error("Shelf attachment missing shelf row");
			}
			return {
				kind: "shelf",
				shelf: {
					slug: row.shelf.slug,
					title: row.shelf.title,
					type: row.shelf.type,
					coverImageUrl: row.shelf.coverImageUrl,
					ownerUsername: row.shelf.user.username,
					bookCount: row.shelf._count.books,
					coverPreviewCoverIds: row.shelf.books.map(
						(entry) => entry.book.coverId,
					),
				},
			};
		}
		case "sitting": {
			if (!row.sitting) {
				throw new Error("Sitting attachment missing sitting row");
			}
			const selectedBookTitle = row.sitting.selectedBook?.title ?? null;
			return {
				kind: "sitting",
				sitting: {
					slug: row.sitting.slug,
					status: row.sitting.status,
					deadline: row.sitting.deadline,
					displayName: formatSittingDisplayName(
						row.sitting.slug,
						row.sitting.status,
						selectedBookTitle,
					),
					pollDeadline: row.sitting.poll?.deadline ?? null,
					participantCount: row.sitting._count.participants,
					selectedBookTitle,
					selectedBookSlug: row.sitting.selectedBook?.slug ?? null,
					selectedBookCoverId: row.sitting.selectedBook?.coverId ?? null,
				},
			};
		}
		case "user": {
			if (!row.member) {
				throw new Error("User attachment missing member row");
			}
			return { kind: "user", user: row.member };
		}
		case "feedback": {
			if (!row.feedback) {
				throw new Error("Feedback attachment missing feedback row");
			}
			return {
				kind: "feedback",
				feedback: {
					slug: row.feedback.slug,
					rating: row.feedback.rating,
					review: row.feedback.review,
					likeCount: row.feedback._count.likes,
					commentCount: row.feedback._count.comments,
					author: row.feedback.author,
					book: row.feedback.book,
				},
			};
		}
		case "post": {
			if (!row.attachedPost) {
				throw new Error("Post attachment missing attached post row");
			}
			return {
				kind: "post",
				post: {
					slug: row.attachedPost.slug,
					contentPreview: truncateAttachmentText(row.attachedPost.content),
					author: row.attachedPost.author,
				},
			};
		}
		case "comment": {
			if (!row.comment) {
				throw new Error("Comment attachment missing comment row");
			}
			const contextPost =
				row.comment.post != null
					? {
							slug: row.comment.post.slug,
							contentPreview: truncateAttachmentText(row.comment.post.content),
							author: row.comment.post.author,
						}
					: null;
			const parentComment =
				row.comment.parent != null
					? {
							contentPreview: truncateAttachmentText(
								row.comment.parent.content,
							),
							author: row.comment.parent.author,
						}
					: null;

			return {
				kind: "comment",
				comment: {
					slug: row.comment.slug,
					contentPreview: truncateAttachmentText(row.comment.content),
					author: row.comment.author,
					contextPost,
					parentComment,
					feedbackBookSlug: row.comment.feedback?.book.slug ?? null,
					feedbackSlug: row.comment.feedback?.slug ?? null,
				},
			};
		}
		default: {
			const _exhaustive: never = row.kind;
			throw new Error(`Unknown attachment kind: ${_exhaustive}`);
		}
	}
}

export function mapPostAttachmentFromPostRow(input: {
	attachment: PostAttachmentRow | null;
	attachedBook: LegacyBookRow;
}): PostAttachmentOutput | null {
	if (input.attachment) {
		return mapAttachmentRow(input.attachment);
	}

	if (input.attachedBook) {
		return { kind: "book", book: input.attachedBook };
	}

	return null;
}

type DbLike = Database | DatabaseTransaction;

export async function resolvePostAttachmentCreateData(
	input: PostAttachmentInput,
	db: DbLike,
): Promise<Prisma.PostAttachmentCreateWithoutPostInput> {
	switch (input.kind) {
		case "book": {
			const book = await db.book.findUnique({
				where: { slug: input.slug },
				select: { id: true },
			});
			if (!book) {
				throw new ORPCError("NOT_FOUND", {
					message: "Book not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "book", book: { connect: { id: book.id } } };
		}
		case "shelf": {
			const shelf = await db.shelf.findFirst({
				where: {
					slug: input.slug,
					user: { username: input.ownerUsername },
				},
				select: { id: true },
			});
			if (!shelf) {
				throw new ORPCError("NOT_FOUND", {
					message: "Shelf not found",
				});
			}
			return { kind: "shelf", shelf: { connect: { id: shelf.id } } };
		}
		case "sitting": {
			const sitting = await db.sitting.findUnique({
				where: { slug: input.slug },
				select: { id: true },
			});
			if (!sitting) {
				throw new ORPCError("NOT_FOUND", {
					message: "Sitting not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "sitting", sitting: { connect: { id: sitting.id } } };
		}
		case "user": {
			const user = await db.user.findUnique({
				where: { username: input.username },
				select: { id: true },
			});
			if (!user) {
				throw new ORPCError("NOT_FOUND", {
					message: "Member not found",
					data: { username: input.username },
				});
			}
			return { kind: "user", member: { connect: { id: user.id } } };
		}
		case "feedback": {
			const feedback = await db.feedback.findUnique({
				where: { slug: input.slug },
				select: { id: true },
			});
			if (!feedback) {
				throw new ORPCError("NOT_FOUND", {
					message: "Feedback not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "feedback", feedback: { connect: { id: feedback.id } } };
		}
		case "post": {
			const attachedPost = await db.post.findUnique({
				where: { slug: input.slug },
				select: { id: true, allowShares: true },
			});
			if (!attachedPost) {
				throw new ORPCError("NOT_FOUND", {
					message: "Post not found",
					data: { slug: input.slug },
				});
			}
			if (!attachedPost.allowShares) {
				throw new ORPCError("FORBIDDEN", {
					message: "Sharing is turned off for that post.",
				});
			}
			return {
				kind: "post",
				attachedPost: { connect: { id: attachedPost.id } },
			};
		}
		case "comment": {
			const comment = await db.comment.findUnique({
				where: { slug: input.slug },
				select: { id: true },
			});
			if (!comment) {
				throw new ORPCError("NOT_FOUND", {
					message: "Comment not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "comment", comment: { connect: { id: comment.id } } };
		}
		default: {
			const _exhaustive: never = input;
			throw new Error(`Unknown attachment kind: ${_exhaustive}`);
		}
	}
}

const emptyAttachmentRelations = {
	book: null,
	shelf: null,
	sitting: null,
	member: null,
	feedback: null,
	attachedPost: null,
	comment: null,
} as const;

async function loadAttachmentPreviewRow(
	input: PostAttachmentInput,
	db: Database,
): Promise<PostAttachmentRow> {
	switch (input.kind) {
		case "book": {
			const book = await db.book.findUnique({
				where: { slug: input.slug },
				select: postAttachedBookCardFields,
			});
			if (!book) {
				throw new ORPCError("NOT_FOUND", {
					message: "Book not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "book", ...emptyAttachmentRelations, book };
		}
		case "shelf": {
			const shelf = await db.shelf.findFirst({
				where: {
					slug: input.slug,
					user: { username: input.ownerUsername },
				},
				select: postAttachmentSelect.shelf.select,
			});
			if (!shelf) {
				throw new ORPCError("NOT_FOUND", { message: "Shelf not found" });
			}
			return { kind: "shelf", ...emptyAttachmentRelations, shelf };
		}
		case "sitting": {
			const sitting = await db.sitting.findUnique({
				where: { slug: input.slug },
				select: postAttachmentSelect.sitting.select,
			});
			if (!sitting) {
				throw new ORPCError("NOT_FOUND", {
					message: "Sitting not found",
					data: { slug: input.slug },
				});
			}
			return { kind: "sitting", ...emptyAttachmentRelations, sitting };
		}
		case "user": {
			const member = await db.user.findUnique({
				where: { username: input.username },
				select: postAttachmentSelect.member.select,
			});
			if (!member) {
				throw new ORPCError("NOT_FOUND", {
					message: "Member not found",
					data: { username: input.username },
				});
			}
			return {
				kind: "user",
				member,
				book: null,
				shelf: null,
				sitting: null,
				feedback: null,
				attachedPost: null,
				comment: null,
			};
		}
		case "feedback": {
			const feedback = await db.feedback.findUnique({
				where: { slug: input.slug },
				select: postAttachmentSelect.feedback.select,
			});
			if (!feedback) {
				throw new ORPCError("NOT_FOUND", {
					message: "Feedback not found",
					data: { slug: input.slug },
				});
			}
			return {
				kind: "feedback",
				feedback,
				book: null,
				shelf: null,
				sitting: null,
				member: null,
				attachedPost: null,
				comment: null,
			};
		}
		case "post": {
			const attachedPost = await db.post.findUnique({
				where: { slug: input.slug },
				select: postAttachmentSelect.attachedPost.select,
			});
			if (!attachedPost) {
				throw new ORPCError("NOT_FOUND", {
					message: "Post not found",
					data: { slug: input.slug },
				});
			}
			return {
				kind: "post",
				attachedPost,
				book: null,
				shelf: null,
				sitting: null,
				member: null,
				feedback: null,
				comment: null,
			};
		}
		case "comment": {
			const comment = await db.comment.findUnique({
				where: { slug: input.slug },
				select: postAttachmentSelect.comment.select,
			});
			if (!comment) {
				throw new ORPCError("NOT_FOUND", {
					message: "Comment not found",
					data: { slug: input.slug },
				});
			}
			return {
				kind: "comment",
				comment,
				book: null,
				shelf: null,
				sitting: null,
				member: null,
				feedback: null,
				attachedPost: null,
			};
		}
		default: {
			const _exhaustive: never = input;
			throw new Error(`Unknown attachment kind: ${_exhaustive}`);
		}
	}
}

export async function getPostAttachmentPreview(
	input: PostAttachmentInput,
	db: Database,
): Promise<PostAttachmentOutput> {
	const row = await loadAttachmentPreviewRow(input, db);
	return mapAttachmentRow(row);
}

export async function syncPostAttachment(
	postId: string,
	attachment: PostAttachmentInput | null | undefined,
	db: DbLike,
): Promise<string | null | undefined> {
	if (attachment === undefined) {
		return undefined;
	}

	await db.postAttachment.deleteMany({ where: { postId } });

	if (attachment === null) {
		return null;
	}

	const data = await resolvePostAttachmentCreateData(attachment, db);
	await db.postAttachment.create({
		data: {
			post: { connect: { id: postId } },
			...data,
		},
	});

	if (attachment.kind === "book") {
		const book = await db.book.findUnique({
			where: { slug: attachment.slug },
			select: { id: true },
		});
		return book?.id ?? null;
	}

	return null;
}
