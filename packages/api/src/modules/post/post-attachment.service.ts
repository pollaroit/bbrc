import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import {
	contentPlainText,
	formatAuthorLifespan,
	formatSittingDisplayName,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { findAuthorBySlug } from "../../lib/authors";
import {
	POST_ATTACHMENT_TRUNCATE,
	type PostAttachmentInput,
	type PostAttachmentOutput,
	postAttachedBookCardFields,
	postAttachmentSelect,
} from "./post-attachment.schema";
import {
	type AttachmentOwner,
	attachmentLocked,
} from "./post-attachment-access";

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

const publicAuthor = (author: {
	username: string;
	name: string;
	image: string | null;
}) => ({ username: author.username, name: author.name, image: author.image });

const blankAuthor = { username: "", name: "", image: null };

/** The attachment as a locked marker: its kind only, no title, owner or cover. */
function lockedAttachment(
	kind: PostAttachmentRow["kind"],
	row: PostAttachmentRow,
): PostAttachmentOutput {
	switch (kind) {
		case "shelf":
			return {
				kind: "shelf",
				locked: true,
				shelf: {
					slug: "",
					title: "",
					type: row.shelf?.type ?? "unordered",
					coverImageUrl: null,
					ownerUsername: "",
					bookCount: 0,
					coverPreviewCoverIds: [],
					isPrivate: true,
				},
			};
		case "user":
			return { kind: "user", locked: true, user: blankAuthor };
		case "feedback":
			return {
				kind: "feedback",
				locked: true,
				feedback: {
					slug: "",
					rating: 0,
					review: "",
					likeCount: 0,
					commentCount: 0,
					author: blankAuthor,
					book: { slug: "", title: "", authors: [], coverId: null },
				},
			};
		case "post":
			return {
				kind: "post",
				locked: true,
				post: { slug: "", contentPreview: "", author: blankAuthor },
			};
		case "comment":
			return {
				kind: "comment",
				locked: true,
				comment: {
					slug: "",
					contentPreview: "",
					author: blankAuthor,
					contextPost: null,
					parentComment: null,
					feedbackBookSlug: null,
					feedbackSlug: null,
				},
			};
		default:
			throw new Error(`Attachment kind ${kind} is never locked`);
	}
}

/** The owners whose settings decide whether the viewer sees this attachment. */
function attachmentOwners(row: PostAttachmentRow): AttachmentOwner[] {
	switch (row.kind) {
		case "shelf":
			return row.shelf
				? [
						{
							id: row.shelf.userId,
							profileVisibility: row.shelf.user.profileVisibility,
							item: row.shelf.visibility,
						},
					]
				: [];
		case "user":
			// Name, username and avatar are public: only a block locks a member.
			return row.member
				? [{ id: row.member.id, profileVisibility: "public" }]
				: [];
		case "feedback":
			return row.feedback
				? [
						{
							id: row.feedback.authorId,
							profileVisibility: row.feedback.author.profileVisibility,
							section: row.feedback.author.reviewsVisibility,
							item: row.feedback.visibility,
						},
					]
				: [];
		case "post":
			return row.attachedPost
				? [
						{
							id: row.attachedPost.authorId,
							profileVisibility: row.attachedPost.author.profileVisibility,
							item: row.attachedPost.visibility,
						},
					]
				: [];
		case "comment": {
			if (!row.comment) return [];
			// A comment is public space: it follows its post (or its review), and
			// a blocked author's comment is left out.
			const owners: AttachmentOwner[] = [
				{ id: row.comment.authorId, profileVisibility: "public" },
			];
			if (row.comment.post) {
				owners.push({
					id: row.comment.post.authorId,
					profileVisibility: row.comment.post.author.profileVisibility,
					item: row.comment.post.visibility,
				});
			}
			if (row.comment.feedback) {
				owners.push({
					id: row.comment.feedback.authorId,
					profileVisibility: row.comment.feedback.author.profileVisibility,
					section: row.comment.feedback.author.reviewsVisibility,
					item: row.comment.feedback.visibility,
				});
			}
			return owners;
		}
		default:
			return [];
	}
}

/** Whether the viewer may not see this attachment (exported for the write checks). */
export function isAttachmentLocked(
	row: PostAttachmentRow,
	viewer: Viewer,
): boolean {
	return attachmentLocked(viewer, attachmentOwners(row));
}

function mapAttachmentRow(
	row: PostAttachmentRow,
	viewer: Viewer,
): PostAttachmentOutput {
	if (isAttachmentLocked(row, viewer)) {
		return lockedAttachment(row.kind, row);
	}
	switch (row.kind) {
		case "book": {
			if (!row.book) {
				throw new Error("Book attachment missing book row");
			}
			return { kind: "book", locked: false, book: row.book };
		}
		case "shelf": {
			if (!row.shelf) {
				throw new Error("Shelf attachment missing shelf row");
			}
			return {
				kind: "shelf",
				locked: false,
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
					isPrivate: false,
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
				locked: false,
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
			return { kind: "user", locked: false, user: publicAuthor(row.member) };
		}
		case "feedback": {
			if (!row.feedback) {
				throw new Error("Feedback attachment missing feedback row");
			}
			return {
				kind: "feedback",
				locked: false,
				feedback: {
					slug: row.feedback.slug,
					rating: row.feedback.rating,
					review: row.feedback.review,
					likeCount: row.feedback._count.likes,
					commentCount: row.feedback._count.comments,
					author: publicAuthor(row.feedback.author),
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
				locked: false,
				post: {
					slug: row.attachedPost.slug,
					contentPreview: truncateAttachmentText(row.attachedPost.content),
					author: publicAuthor(row.attachedPost.author),
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
							author: publicAuthor(row.comment.post.author),
						}
					: null;
			const parentComment =
				row.comment.parent != null
					? {
							contentPreview: truncateAttachmentText(
								row.comment.parent.content,
							),
							author: publicAuthor(row.comment.parent.author),
						}
					: null;

			return {
				kind: "comment",
				locked: false,
				comment: {
					slug: row.comment.slug,
					contentPreview: truncateAttachmentText(row.comment.content),
					author: publicAuthor(row.comment.author),
					contextPost,
					parentComment,
					feedbackBookSlug: row.comment.feedback?.book.slug ?? null,
					feedbackSlug: row.comment.feedback?.slug ?? null,
				},
			};
		}
		case "author": {
			if (!row.authorSlug || !row.authorName) {
				throw new Error("Author attachment missing author");
			}
			return {
				kind: "author",
				locked: false,
				author: {
					slug: row.authorSlug,
					name: row.authorName,
					photoUrl: null,
					lifespan: null,
					bookCount: null,
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
	viewer: Viewer;
}): PostAttachmentOutput | null {
	if (input.attachment) {
		return mapAttachmentRow(input.attachment, input.viewer);
	}

	if (input.attachedBook) {
		return { kind: "book", locked: false, book: input.attachedBook };
	}

	return null;
}

type DbLike = Database | DatabaseTransaction;

export async function resolvePostAttachmentCreateData(
	input: PostAttachmentInput,
	db: DbLike,
	/** Who is attaching it; a member can always attach themselves. */
	actorId?: string,
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
				select: { id: true, visibility: true },
			});
			if (!shelf) {
				throw new ORPCError("NOT_FOUND", {
					message: "Shelf not found",
				});
			}
			if (shelf.visibility === "private") {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"A private shelf cannot be shared in a post. Make it public first.",
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
				select: { id: true, name: true, allowPostAttachment: true },
			});
			if (!user) {
				throw new ORPCError("NOT_FOUND", {
					message: "Member not found",
					data: { username: input.username },
				});
			}
			if (!user.allowPostAttachment && user.id !== actorId) {
				throw new ORPCError("FORBIDDEN", {
					message: `${user.name} does not allow being attached to posts.`,
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
		case "author": {
			const author = await findAuthorBySlug(db as Database, input.slug);
			if (!author) {
				throw new ORPCError("NOT_FOUND", {
					message: "Author not found",
					data: { slug: input.slug },
				});
			}
			return {
				kind: "author",
				authorSlug: author.slug,
				authorName: author.name,
			};
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
	authorSlug: null,
	authorName: null,
} as const;

async function loadAttachmentPreviewRow(
	input: PostAttachmentInput,
	db: Database,
	actorId?: string,
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
				select: {
					...postAttachmentSelect.member.select,
					id: true,
					allowPostAttachment: true,
				},
			});
			if (!member) {
				throw new ORPCError("NOT_FOUND", {
					message: "Member not found",
					data: { username: input.username },
				});
			}
			if (!member.allowPostAttachment && member.id !== actorId) {
				throw new ORPCError("FORBIDDEN", {
					message: `${member.name} does not allow being attached to posts.`,
				});
			}
			return {
				kind: "user",
				...emptyAttachmentRelations,
				member: {
					id: member.id,
					username: member.username,
					name: member.name,
					image: member.image,
				},
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
			return { kind: "feedback", ...emptyAttachmentRelations, feedback };
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
			return { kind: "post", ...emptyAttachmentRelations, attachedPost };
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
			return { kind: "comment", ...emptyAttachmentRelations, comment };
		}
		case "author": {
			const author = await findAuthorBySlug(db, input.slug);
			if (!author) {
				throw new ORPCError("NOT_FOUND", {
					message: "Author not found",
					data: { slug: input.slug },
				});
			}
			return {
				kind: "author",
				...emptyAttachmentRelations,
				authorSlug: author.slug,
				authorName: author.name,
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
	viewer: Viewer,
): Promise<PostAttachmentOutput> {
	const actorId = viewer.kind === "member" ? viewer.userId : undefined;
	const row = await loadAttachmentPreviewRow(input, db, actorId);
	const attachment = mapAttachmentRow(row, viewer);
	await fillAuthorAttachments(db, [attachment]);
	return attachment;
}

/**
 * Fills in photo, lifespan and book count on author attachments (one batch for any number of
 * posts), and follows merged slugs to the canonical page. Changes the attachments in place.
 */
export async function fillAuthorAttachments(
	db: Database,
	attachments: (PostAttachmentOutput | null | undefined)[],
): Promise<void> {
	const authorAttachments = attachments.filter(
		(
			attachment,
		): attachment is Extract<PostAttachmentOutput, { kind: "author" }> =>
			attachment?.kind === "author",
	);
	if (authorAttachments.length === 0) return;

	const slugs = [...new Set(authorAttachments.map((a) => a.author.slug))];
	const select = {
		id: true,
		slug: true,
		name: true,
		photoUrl: true,
		birthYear: true,
		deathYear: true,
	} as const;
	const direct = await db.author.findMany({
		where: { slug: { in: slugs } },
		select,
	});
	const bySlug = new Map(direct.map((author) => [author.slug, author]));
	const missing = slugs.filter((slug) => !bySlug.has(slug));
	if (missing.length > 0) {
		const redirects = await db.authorSlugRedirect.findMany({
			where: { slug: { in: missing } },
			select: { slug: true, author: { select } },
		});
		for (const redirect of redirects) {
			bySlug.set(redirect.slug, redirect.author);
		}
	}

	const ids = [...new Set([...bySlug.values()].map((author) => author.id))];
	const counts =
		ids.length > 0
			? await db.bookAuthor.groupBy({
					by: ["authorId"],
					where: { authorId: { in: ids } },
					_count: { _all: true },
				})
			: [];
	const countById = new Map(
		counts.map((row) => [row.authorId, row._count._all]),
	);

	for (const attachment of authorAttachments) {
		const author = bySlug.get(attachment.author.slug);
		if (!author) continue;
		attachment.author = {
			slug: author.slug,
			name: author.name,
			photoUrl: author.photoUrl,
			lifespan: formatAuthorLifespan({
				birth: { year: author.birthYear },
				death: { year: author.deathYear },
			}),
			bookCount: countById.get(author.id) ?? 0,
		};
	}
}

export async function syncPostAttachment(
	postId: string,
	attachment: PostAttachmentInput | null | undefined,
	db: DbLike,
	actorId?: string,
): Promise<string | null | undefined> {
	if (attachment === undefined) {
		return undefined;
	}

	await db.postAttachment.deleteMany({ where: { postId } });

	if (attachment === null) {
		return null;
	}

	const data = await resolvePostAttachmentCreateData(attachment, db, actorId);
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

/**
 * Refuses attaching something the author may not see themselves (another member's
 * private shelf, a post of a member who blocked them...). Call before saving.
 */
export async function assertAttachmentVisible(
	input: PostAttachmentInput,
	db: Database,
	viewer: Viewer,
): Promise<void> {
	const row = await loadAttachmentPreviewRow(
		input,
		db,
		viewer.kind === "member" ? viewer.userId : undefined,
	);
	if (isAttachmentLocked(row, viewer)) {
		throw new ORPCError("NOT_FOUND", {
			message: "That cannot be attached: it is not available to you.",
		});
	}
}
