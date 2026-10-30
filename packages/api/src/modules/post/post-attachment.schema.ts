import {
	BookSchema,
	CommentSchema,
	FeedbackSchema,
	PostSchema,
	ShelfTypeSchema,
	SittingSchema,
	SittingStatusSchema,
	UserSchema,
} from "@bbrc/schemas";
import zod from "zod";

/** Loose on purpose: a locked attachment blanks the author (see `locked` on every attachment). */
const PostAuthorSchema = UserSchema.pick({
	username: true,
	name: true,
	image: true,
}).extend({ username: zod.string(), name: zod.string() });

/**
 * Set when the viewer may not see the attached thing (a private profile, friends only, a
 * blocked member): the kind stays, every detail is blank.
 */
const lockedField = zod.boolean().default(false);

const postAuthorFields = {
	username: true,
	name: true,
	image: true,
} as const;

export const POST_ATTACHMENT_TRUNCATE = 100;

export const postAttachedBookCardFields = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	status: true,
	averageRating: true,
} as const;

export const PostAttachedBookCardSchema = BookSchema.pick(
	postAttachedBookCardFields,
);

export const PostAttachmentBookSchema = zod.object({
	kind: zod.literal("book"),
	locked: lockedField,
	book: PostAttachedBookCardSchema,
});

export const PostAttachmentShelfSchema = zod.object({
	kind: zod.literal("shelf"),
	locked: lockedField,
	shelf: zod.object({
		slug: zod.string(),
		title: zod.string(),
		type: ShelfTypeSchema,
		coverImageUrl: zod.string().max(2048).nullable(),
		ownerUsername: zod.string(),
		bookCount: zod.number().int().min(0),
		coverPreviewCoverIds: zod.array(zod.number().nullable()).max(4),
		/** The shelf was made private after it was shared: its details are hidden. */
		isPrivate: zod.boolean().default(false),
	}),
});

export const PostAttachmentSittingSchema = zod.object({
	kind: zod.literal("sitting"),
	locked: lockedField,
	sitting: zod.object({
		slug: SittingSchema.shape.slug,
		status: SittingStatusSchema,
		deadline: zod.coerce.date(),
		displayName: zod.string().min(1),
		pollDeadline: zod.coerce.date().nullable(),
		participantCount: zod.number().int().min(0),
		selectedBookTitle: zod.string().nullable(),
		selectedBookSlug: BookSchema.shape.slug.nullable(),
		selectedBookCoverId: zod.number().nullable(),
	}),
});

export const PostAttachmentUserSchema = zod.object({
	kind: zod.literal("user"),
	locked: lockedField,
	user: PostAuthorSchema,
});

export const PostAttachmentFeedbackSchema = zod.object({
	kind: zod.literal("feedback"),
	locked: lockedField,
	feedback: zod.object({
		slug: zod.string(),
		rating: FeedbackSchema.shape.rating,
		review: FeedbackSchema.shape.review,
		likeCount: zod.number().int().min(0),
		commentCount: zod.number().int().min(0),
		author: PostAuthorSchema,
		book: BookSchema.pick({
			slug: true,
			title: true,
			authors: true,
			coverId: true,
		}).extend({ slug: zod.string() }),
	}),
});

export const PostAttachmentPostSchema = zod.object({
	kind: zod.literal("post"),
	locked: lockedField,
	post: zod.object({
		slug: zod.string(),
		contentPreview: zod.string(),
		author: PostAuthorSchema,
	}),
});

export const PostAttachmentCommentSchema = zod.object({
	kind: zod.literal("comment"),
	locked: lockedField,
	comment: zod.object({
		slug: zod.string(),
		contentPreview: zod.string(),
		author: PostAuthorSchema,
		contextPost: zod
			.object({
				slug: zod.string(),
				contentPreview: zod.string(),
				author: PostAuthorSchema,
			})
			.nullable(),
		parentComment: zod
			.object({
				contentPreview: zod.string(),
				author: PostAuthorSchema,
			})
			.nullable(),
		feedbackBookSlug: BookSchema.shape.slug.nullable(),
		feedbackSlug: FeedbackSchema.shape.slug.nullable(),
	}),
});

export const PostAttachmentAuthorSchema = zod.object({
	kind: zod.literal("author"),
	locked: lockedField,
	author: zod.object({
		slug: zod.string(),
		name: zod.string(),
		/** The author's photo, when an admin chose one. */
		photoUrl: zod.string().nullable(),
		/** "1821–1881", "b. 1965" or null when unknown. */
		lifespan: zod.string().nullable(),
		/** Books by the author in the library (null until looked up). */
		bookCount: zod.number().int().nullable(),
	}),
});

export const PostAttachmentOutputSchema = zod.discriminatedUnion("kind", [
	PostAttachmentBookSchema,
	PostAttachmentShelfSchema,
	PostAttachmentSittingSchema,
	PostAttachmentUserSchema,
	PostAttachmentFeedbackSchema,
	PostAttachmentPostSchema,
	PostAttachmentCommentSchema,
	PostAttachmentAuthorSchema,
]);

export type PostAttachmentOutput = zod.infer<typeof PostAttachmentOutputSchema>;

export const PostAttachmentInputSchema = zod.discriminatedUnion("kind", [
	zod.object({
		kind: zod.literal("book"),
		slug: BookSchema.shape.slug,
	}),
	zod.object({
		kind: zod.literal("shelf"),
		ownerUsername: UserSchema.shape.username,
		slug: zod.string().min(3).max(60),
	}),
	zod.object({
		kind: zod.literal("sitting"),
		slug: SittingSchema.shape.slug,
	}),
	zod.object({
		kind: zod.literal("user"),
		username: UserSchema.shape.username,
	}),
	zod.object({
		kind: zod.literal("feedback"),
		slug: FeedbackSchema.shape.slug,
	}),
	zod.object({
		kind: zod.literal("post"),
		slug: PostSchema.shape.slug,
	}),
	zod.object({
		kind: zod.literal("comment"),
		slug: CommentSchema.shape.slug,
	}),
	zod.object({
		kind: zod.literal("author"),
		/** The author's slug, as in /authors/[slug]. */
		slug: zod.string().min(1).max(120),
	}),
]);

export type PostAttachmentInput = zod.infer<typeof PostAttachmentInputSchema>;

export const postAttachmentSelect = {
	kind: true,
	authorSlug: true,
	authorName: true,
	book: {
		select: postAttachedBookCardFields,
	},
	shelf: {
		select: {
			slug: true,
			title: true,
			type: true,
			visibility: true,
			coverImageUrl: true,
			userId: true,
			user: {
				select: { username: true, profileVisibility: true },
			},
			books: {
				orderBy: { position: "asc" },
				take: 4,
				select: {
					book: {
						select: { coverId: true },
					},
				},
			},
			_count: {
				select: { books: true },
			},
		},
	},
	sitting: {
		select: {
			slug: true,
			status: true,
			deadline: true,
			poll: {
				select: { deadline: true },
			},
			selectedBook: {
				select: { slug: true, title: true, coverId: true },
			},
			_count: {
				select: {
					participants: { where: { removedAt: null } },
				},
			},
		},
	},
	member: {
		select: { ...postAuthorFields, id: true },
	},
	feedback: {
		select: {
			slug: true,
			rating: true,
			review: true,
			visibility: true,
			authorId: true,
			author: {
				select: {
					...postAuthorFields,
					profileVisibility: true,
					reviewsVisibility: true,
				},
			},
			book: {
				select: {
					slug: true,
					title: true,
					authors: true,
					coverId: true,
				},
			},
			_count: {
				select: {
					likes: true,
					comments: true,
				},
			},
		},
	},
	attachedPost: {
		select: {
			slug: true,
			content: true,
			visibility: true,
			authorId: true,
			author: {
				select: { ...postAuthorFields, profileVisibility: true },
			},
		},
	},
	comment: {
		select: {
			slug: true,
			content: true,
			depth: true,
			postId: true,
			feedbackId: true,
			authorId: true,
			author: {
				select: postAuthorFields,
			},
			post: {
				select: {
					slug: true,
					content: true,
					visibility: true,
					authorId: true,
					author: {
						select: { ...postAuthorFields, profileVisibility: true },
					},
				},
			},
			feedback: {
				select: {
					slug: true,
					authorId: true,
					visibility: true,
					author: {
						select: { profileVisibility: true, reviewsVisibility: true },
					},
					book: {
						select: { slug: true },
					},
				},
			},
			parent: {
				select: {
					content: true,
					author: {
						select: postAuthorFields,
					},
				},
			},
		},
	},
} as const;
