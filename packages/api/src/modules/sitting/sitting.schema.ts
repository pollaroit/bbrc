import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	FeedbackSchema,
	PollSchema,
	ProgressSchema,
	SittingSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import {
	bookCountryCodeSchema,
	isAuthorSlug,
	isSlug,
	SLUG_MAX_LENGTH,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";
import {
	BookWithRequestedBySchema,
	getBookListFields,
	getBookPollSelect,
} from "../book/book.schema";
import {
	MemberLevelSchema,
	UserMemberSnapshotSchema,
} from "../user/user.schema";
import {
	sittingListFiltersSchema,
	sittingListRanging,
	sittingListSearching,
	sittingListSorting,
} from "./sitting.listing";

/** Deadlines read from the DB (create/update inputs still use Prisma “future” refines). */
export const SittingStoredDeadlineSchema = zod.coerce.date();
export const PollStoredDeadlineSchema = zod.coerce.date();

export {
	sittingListRanging,
	sittingListSearching,
	sittingListSorting,
	sittingOngoingStatuses,
	sittingOngoingWhere,
	sittingRangeableFields,
	sittingSearchableFields,
	sittingSortableFields,
	sittingStatusFilterLabels,
} from "./sitting.listing";

export const SITTING_POLL_SLUG_PREFIX = "poll_of_" as const;

/** Poll slugs follow `poll_of_{sittingSlug}` (truncated to fit slug rules). */
export function buildSittingPollSlug(sittingSlug: string): string {
	const combined = `${SITTING_POLL_SLUG_PREFIX}${sittingSlug}`;

	if (combined.length <= SLUG_MAX_LENGTH && isSlug(combined)) {
		return combined;
	}

	const maxSittingPartLength =
		SLUG_MAX_LENGTH - SITTING_POLL_SLUG_PREFIX.length;
	const trimmedSittingSlug = sittingSlug
		.slice(0, maxSittingPartLength)
		.replace(/_+$/, "");
	const candidate = `${SITTING_POLL_SLUG_PREFIX}${trimmedSittingSlug}`;

	if (!isSlug(candidate)) {
		throw new Error("Could not derive a valid poll slug from sitting slug");
	}

	return candidate;
}

export const CreateSittingPollInputSchema = zod
	.object({
		minPages: PollSchema.shape.minPages,
		maxPages: PollSchema.shape.maxPages,
		minPublishedIn: PollSchema.shape.minPublishedIn,
		maxPublishedIn: PollSchema.shape.maxPublishedIn,
		minOpenLibraryRating: PollSchema.shape.minOpenLibraryRating,
		minReads: PollSchema.shape.minReads,
		maxReads: PollSchema.shape.maxReads,
		countries: zod.array(bookCountryCodeSchema).optional(),
		authors: zod
			.array(
				zod.string().refine(isAuthorSlug, { message: "Invalid author slug" }),
			)
			.optional(),
		take: PollSchema.shape.take.optional(),
		minChoices: PollSchema.shape.minChoices.optional(),
		maxChoices: PollSchema.shape.maxChoices,
	})
	.partial();

export type CreateSittingPollInput = z.infer<
	typeof CreateSittingPollInputSchema
>;

function refinePollConfig(
	value: {
		minPages?: number | null;
		maxPages?: number | null;
		minPublishedIn?: number | null;
		maxPublishedIn?: number | null;
		minReads?: number | null;
		maxReads?: number | null;
		take?: number;
		minChoices?: number;
		maxChoices?: number | null;
	},
	ctx: zod.RefinementCtx,
	pathPrefix: (string | number)[] = [],
) {
	const take = value.take ?? 10;
	const minChoices = value.minChoices ?? 1;
	const maxChoices = value.maxChoices ?? take;

	if (
		value.minPages != null &&
		value.maxPages != null &&
		value.maxPages < value.minPages
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum pages must be greater than or equal to minimum pages",
			path: [...pathPrefix, "maxPages"],
		});
	}

	if (
		value.minPublishedIn != null &&
		value.maxPublishedIn != null &&
		value.maxPublishedIn < value.minPublishedIn
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum publish year must be greater than or equal to minimum publish year",
			path: [...pathPrefix, "maxPublishedIn"],
		});
	}

	if (
		value.minReads != null &&
		value.maxReads != null &&
		value.maxReads < value.minReads
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum reads must be greater than or equal to minimum reads",
			path: [...pathPrefix, "maxReads"],
		});
	}

	if (maxChoices < minChoices) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum choices must be greater than or equal to minimum choices",
			path: [...pathPrefix, "maxChoices"],
		});
	}

	if (maxChoices > take) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum choices cannot exceed poll option count (take)",
			path: [...pathPrefix, "maxChoices"],
		});
	}

	if (minChoices > take) {
		ctx.addIssue({
			code: "custom",
			message: "Minimum choices cannot exceed poll option count (take)",
			path: [...pathPrefix, "minChoices"],
		});
	}
}

export const CreateSittingInputSchema = zod
	.object({
		pollDeadline: PollSchema.shape.deadline.optional(),
		participantUserIds: zod
			.array(UserSchema.shape.id)
			.min(1, "At least one participant is required"),
		poll: CreateSittingPollInputSchema.default({}),
		/** Reviewed poll options from the admin create flow; omit to auto-draw. */
		optionBookIds: zod.array(BookSchema.shape.id).optional(),
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const CreateSittingOutputSchema = zod.object({
	slug: SittingSchema.shape.slug,
	pollSlug: PollSchema.shape.slug,
});

export type CreateSittingInput = z.infer<typeof CreateSittingInputSchema>;
export type CreateSittingOutput = z.infer<typeof CreateSittingOutputSchema>;

/** LIST — composed as a concrete ZodObject so oRPC clients get input autocomplete. */
export const GetSittingListInputSchema = sittingListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(sittingListSorting.inputSchema.shape)
	.extend(sittingListRanging.inputSchema.shape)
	.extend(sittingListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);

		if (value.ongoingOnly && value.statuses?.includes("finished")) {
			ctx.addIssue({
				code: "custom",
				message:
					"Cannot filter for finished sittings when ongoingOnly is enabled",
				path: ["statuses"],
			});
		}
	});

export const getSittingListFields = {
	slug: true,
	status: true,
	deadline: true,
	createdAt: true,
	selectedBook: {
		select: { title: true },
	},
	_count: {
		select: {
			participants: { where: { removedAt: null } },
		},
	},
} as const;

const SittingListItemSchema = SittingSchema.pick({
	slug: true,
	status: true,
	createdAt: true,
}).extend({
	deadline: SittingStoredDeadlineSchema,
	participantCount: zod.number().int().min(0),
	displayName: zod.string().min(1),
});

export const GetSittingListOutputSchema = CursorPaginationOutputSchema(
	SittingListItemSchema,
);

export type GetSittingListInput = z.infer<typeof GetSittingListInputSchema>;
export type GetSittingListOutput = z.infer<typeof GetSittingListOutputSchema>;

export const SittingPollSummarySchema = PollSchema.pick({
	slug: true,
	minPages: true,
	maxPages: true,
	minPublishedIn: true,
	maxPublishedIn: true,
	minOpenLibraryRating: true,
	minReads: true,
	maxReads: true,
	take: true,
	minChoices: true,
	maxChoices: true,
}).extend({
	deadline: PollStoredDeadlineSchema,
	countries: zod.array(bookCountryCodeSchema),
	authors: zod.array(
		zod.string().refine(isAuthorSlug, { message: "Invalid author slug" }),
	),
});

export const SittingPollOptionBookSchema = BookWithRequestedBySchema.extend({
	id: BookSchema.shape.id,
});

export const PollVotePointsSchema = zod.union([
	zod.literal(1),
	zod.literal(2),
	zod.literal(3),
]);

export const PollVoteSelectionSchema = zod.object({
	optionId: zod.uuid(),
	points: PollVotePointsSchema.default(1),
});

export const PollChipGrantSchema = zod.object({
	canUseGolden: zod.boolean(),
	canUseSilver: zod.boolean(),
});

export const SittingPollOptionSchema = zod.object({
	id: zod.uuid(),
	/** Number of voters who selected this option. */
	voteCount: zod.number().int().min(0),
	/** Sum of vote points (1/2/3 chips). Hidden from non-admins during voting. */
	pointTotal: zod.number().int().min(0),
	/** Participants (active on this sitting) who marked this book read. */
	participantReadCount: zod.number().int().min(0),
	/** Signed-in viewer has marked this book read (false when anonymous). */
	viewerHasRead: zod.boolean(),
	book: SittingPollOptionBookSchema,
});

export const SittingPollPreviewOptionSchema = zod.object({
	book: SittingPollOptionBookSchema,
	participantReadCount: zod.number().int().min(0),
});

export const PreviewSittingPollOptionsInputSchema = zod
	.object({
		participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
		poll: CreateSittingPollInputSchema.default({}),
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const PreviewSittingPollOptionsOutputSchema = zod.object({
	options: zod.array(SittingPollPreviewOptionSchema),
	eligiblePoolSize: zod.number().int().min(0),
	usedUniformFallback: zod.boolean(),
});

export type PreviewSittingPollOptionsInput = z.infer<
	typeof PreviewSittingPollOptionsInputSchema
>;
export type PreviewSittingPollOptionsOutput = z.infer<
	typeof PreviewSittingPollOptionsOutputSchema
>;

export const ReplaceSittingPollPreviewOptionInputSchema = zod
	.object({
		participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
		poll: CreateSittingPollInputSchema.default({}),
		currentOptionBookIds: zod.array(BookSchema.shape.id).min(3),
		replaceBookId: BookSchema.shape.id,
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const ShuffleSittingPollPreviewOptionsInputSchema = zod
	.object({
		participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
		poll: CreateSittingPollInputSchema.default({}),
		currentOptionBookIds: zod.array(BookSchema.shape.id).min(3),
		lockedBookIds: zod.array(BookSchema.shape.id).default([]),
	})
	.superRefine((value, ctx) => {
		refinePollConfig(value.poll, ctx, ["poll"]);
	});

export const ShuffleSittingPollPreviewOptionsOutputSchema = zod.object({
	options: zod.array(SittingPollPreviewOptionSchema),
	usedUniformFallback: zod.boolean(),
	partialShuffle: zod.boolean(),
});

export type ShuffleSittingPollPreviewOptionsInput = z.infer<
	typeof ShuffleSittingPollPreviewOptionsInputSchema
>;
export type ShuffleSittingPollPreviewOptionsOutput = z.infer<
	typeof ShuffleSittingPollPreviewOptionsOutputSchema
>;

export const ReplaceSittingPollPreviewOptionOutputSchema = zod.object({
	option: SittingPollPreviewOptionSchema,
	usedUniformFallback: zod.boolean(),
});

export type ReplaceSittingPollPreviewOptionInput = z.infer<
	typeof ReplaceSittingPollPreviewOptionInputSchema
>;
export type ReplaceSittingPollPreviewOptionOutput = z.infer<
	typeof ReplaceSittingPollPreviewOptionOutputSchema
>;

export const SittingPollDetailSchema = SittingPollSummarySchema.extend({
	options: zod.array(SittingPollOptionSchema),
	myVoteOptionIds: zod.array(zod.uuid()),
	myVotes: zod.array(PollVoteSelectionSchema),
	myChipGrants: PollChipGrantSchema,
	voterCount: zod.number().int().min(0),
});

export const SittingParticipantSummarySchema = UserMemberSnapshotSchema.extend({
	userId: UserSchema.shape.id,
	xpLevel: MemberLevelSchema,
	rpLevel: MemberLevelSchema,
	progress: ProgressSchema,
	rpChange: zod.number().int().nullable(),
	/** Poll chip tier at voting start (1 = Golden+Silver, 2 = Silver only). */
	pollChipRank: zod.union([zod.literal(1), zod.literal(2)]).nullable(),
});

export const SittingRemovedParticipantSchema =
	SittingParticipantSummarySchema.extend({
		removedAt: zod.coerce.date(),
	});

export const SittingSelectedBookSchema = BookSchema.pick(getBookListFields);

export const SittingReviewSummarySchema = zod.object({
	slug: FeedbackSchema.shape.slug,
	authorId: UserSchema.shape.id,
	username: zod.string(),
	name: zod.string(),
	image: UserSchema.shape.image,
	rating: zod.number().min(0).max(5),
	review: zod.string().min(1).max(500),
	isSpoiler: FeedbackSchema.shape.isSpoiler,
	createdAt: zod.coerce.date(),
	likeCount: zod.number().int().min(0),
	likedByMe: zod.boolean(),
	commentCount: zod.number().int().min(0),
});

export const getSittingBySlugFields = {
	id: true,
	slug: true,
	status: true,
	deadline: true,
	createdAt: true,
	selectedBookId: true,
	selectedBook: {
		select: getBookListFields,
	},
	poll: {
		select: {
			id: true,
			slug: true,
			deadline: true,
			minPages: true,
			maxPages: true,
			minPublishedIn: true,
			maxPublishedIn: true,
			minOpenLibraryRating: true,
			minReads: true,
			maxReads: true,
			filterCountries: true,
			filterAuthorSlugs: true,
			take: true,
			minChoices: true,
			maxChoices: true,
			options: {
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					_count: {
						select: {
							votes: true,
						},
					},
					book: {
						select: getBookPollSelect,
					},
				},
			},
		},
	},
	participants: {
		where: { removedAt: null },
		select: {
			userId: true,
			progress: true,
			user: {
				select: {
					username: true,
					name: true,
					image: true,
					status: true,
					isHidden: true,
					xp: true,
					rp: true,
				},
			},
		},
	},
} as const;

export const getSittingRemovedParticipantFields = {
	userId: true,
	progress: true,
	removedAt: true,
	user: {
		select: {
			username: true,
			name: true,
			image: true,
			status: true,
			xp: true,
			rp: true,
		},
	},
} as const;

/** GET BY SLUG */
export const GetSittingBySlugOutputSchema = SittingSchema.pick({
	slug: true,
	status: true,
	createdAt: true,
}).extend({
	deadline: SittingStoredDeadlineSchema,
	displayName: zod.string().min(1),
	poll: SittingPollDetailSchema.nullable(),
	selectedBook: SittingSelectedBookSchema.nullable(),
	reviews: zod.array(SittingReviewSummarySchema),
	participants: zod.array(SittingParticipantSummarySchema),
	removedParticipants: zod.array(SittingRemovedParticipantSchema),
});

export type GetSittingBySlugOutput = z.infer<
	typeof GetSittingBySlugOutputSchema
>;

export const OngoingSittingParticipantPreviewSchema =
	UserMemberSnapshotSchema.pick({
		username: true,
		name: true,
		image: true,
	});

/** ONGOING — at most one sitting in voting or reading */
export const GetOngoingSittingOutputSchema = SittingSchema.pick({
	slug: true,
	status: true,
	createdAt: true,
})
	.extend({
		deadline: SittingStoredDeadlineSchema,
		participantCount: zod.number().int().min(0),
		displayName: zod.string().min(1),
		pollDeadline: PollStoredDeadlineSchema.nullable(),
		selectedBookTitle: zod.string().nullable(),
		selectedBookAuthors: zod.array(zod.string()),
		participantPreview: zod.array(OngoingSittingParticipantPreviewSchema),
		viewerIsParticipant: zod.boolean(),
	})
	.nullable();

export type GetOngoingSittingOutput = z.infer<
	typeof GetOngoingSittingOutputSchema
>;

export const SubmitPollVotesInputSchema = zod.object({
	sittingSlug: SittingSchema.shape.slug,
	votes: zod.array(PollVoteSelectionSchema),
});

export const SubmitPollVotesOutputSchema = zod.object({
	myVoteOptionIds: zod.array(zod.uuid()),
	myVotes: zod.array(PollVoteSelectionSchema),
	myChipGrants: PollChipGrantSchema,
	xpAwarded: zod.number().int().min(0).nullable(),
});

export type SubmitPollVotesInput = z.infer<typeof SubmitPollVotesInputSchema>;
export type SubmitPollVotesOutput = z.infer<typeof SubmitPollVotesOutputSchema>;

export const GetPollOptionVotesInputSchema = zod.object({
	pollOptionId: zod.uuid(),
});

export const PollOptionVoterSchema = zod.object({
	user: SittingParticipantSummarySchema.pick({
		username: true,
		name: true,
		image: true,
		status: true,
	}),
	votedAt: zod.coerce.date(),
	points: PollVotePointsSchema,
	totalSelections: zod.number().int().min(1),
	maxChoices: zod.number().int().min(1),
});

export const GetPollOptionVotesOutputSchema = zod.object({
	bookTitle: zod.string(),
	voters: zod.array(PollOptionVoterSchema),
});

export type GetPollOptionVotesInput = z.infer<
	typeof GetPollOptionVotesInputSchema
>;
export type GetPollOptionVotesOutput = z.infer<
	typeof GetPollOptionVotesOutputSchema
>;

export const GetPollOptionReadersInputSchema = zod.object({
	pollOptionId: zod.uuid(),
});

export const PollOptionReaderSchema = zod.object({
	user: SittingParticipantSummarySchema.pick({
		username: true,
		name: true,
		image: true,
		status: true,
	}),
	readRecordedAt: zod.coerce.date(),
});

export const GetPollOptionReadersOutputSchema = zod.object({
	bookTitle: zod.string(),
	participantCount: zod.number().int().min(0),
	readers: zod.array(PollOptionReaderSchema),
});

export type GetPollOptionReadersInput = z.infer<
	typeof GetPollOptionReadersInputSchema
>;
export type GetPollOptionReadersOutput = z.infer<
	typeof GetPollOptionReadersOutputSchema
>;

/** Before a sitting exists: list participants (from create form) who read a poll book. */
export const GetSittingPollPreviewReadersInputSchema = zod.object({
	bookId: BookSchema.shape.id,
	participantUserIds: CreateSittingInputSchema.shape.participantUserIds,
});

export type GetSittingPollPreviewReadersInput = z.infer<
	typeof GetSittingPollPreviewReadersInputSchema
>;

export const GetPollVotesByUserInputSchema = zod.object({
	sittingSlug: SittingSchema.shape.slug,
});

export const PollVoteByUserChoiceSchema = zod.object({
	pollOptionId: zod.uuid(),
	bookTitle: zod.string(),
	points: PollVotePointsSchema,
	votedAt: zod.coerce.date(),
});

export const PollVotesByUserEntrySchema = zod.object({
	user: SittingParticipantSummarySchema.pick({
		username: true,
		name: true,
		image: true,
		status: true,
	}),
	choices: zod.array(PollVoteByUserChoiceSchema).min(1),
	maxChoices: zod.number().int().min(1),
});

export const GetPollVotesByUserOutputSchema = zod.object({
	maxChoices: zod.number().int().min(1),
	voters: zod.array(PollVotesByUserEntrySchema),
});

export type GetPollVotesByUserInput = z.infer<
	typeof GetPollVotesByUserInputSchema
>;
export type GetPollVotesByUserOutput = z.infer<
	typeof GetPollVotesByUserOutputSchema
>;

export const TransitionSittingInputSchema = zod.discriminatedUnion(
	"transition",
	[
		zod.object({
			slug: SittingSchema.shape.slug,
			transition: zod.literal("start_reading"),
			selectedPollOptionId: zod.uuid(),
		}),
		zod.object({
			slug: SittingSchema.shape.slug,
			transition: zod.literal("finish"),
		}),
	],
);

export const TransitionSittingOutputSchema = SittingSchema.pick({
	slug: true,
	status: true,
}).extend({
	selectedBook: SittingSelectedBookSchema.nullable(),
});

export type TransitionSittingInput = z.infer<
	typeof TransitionSittingInputSchema
>;
export type TransitionSittingOutput = z.infer<
	typeof TransitionSittingOutputSchema
>;

export const UpdateSittingDeadlinesInputSchema = zod
	.object({
		slug: SittingSchema.shape.slug,
		pollDeadline: PollSchema.shape.deadline.optional(),
		sittingDeadline: SittingSchema.shape.deadline.optional(),
	})
	.superRefine((value, ctx) => {
		if (value.pollDeadline == null && value.sittingDeadline == null) {
			ctx.addIssue({
				code: "custom",
				message: "Provide at least one deadline to update",
				path: ["pollDeadline"],
			});
		}
	});

export const UpdateSittingDeadlinesOutputSchema = zod.object({
	slug: SittingSchema.shape.slug,
	pollDeadline: PollStoredDeadlineSchema.nullable(),
	sittingDeadline: SittingStoredDeadlineSchema,
});

export type UpdateSittingDeadlinesInput = z.infer<
	typeof UpdateSittingDeadlinesInputSchema
>;
export type UpdateSittingDeadlinesOutput = z.infer<
	typeof UpdateSittingDeadlinesOutputSchema
>;

export const UpdateMyParticipationProgressInputSchema = zod.object({
	slug: SittingSchema.shape.slug,
	progress: ProgressSchema,
});

export const UpdateMyParticipationProgressOutputSchema =
	SittingParticipantSummarySchema.pick({
		userId: true,
		progress: true,
	});

export type UpdateMyParticipationProgressInput = z.infer<
	typeof UpdateMyParticipationProgressInputSchema
>;
export type UpdateMyParticipationProgressOutput = z.infer<
	typeof UpdateMyParticipationProgressOutputSchema
>;

export const UpdateParticipationInputSchema = zod.object({
	slug: SittingSchema.shape.slug,
	userId: UserSchema.shape.id,
	progress: ProgressSchema,
});

export const UpdateParticipationOutputSchema = SittingParticipantSummarySchema;

export type UpdateParticipationInput = z.infer<
	typeof UpdateParticipationInputSchema
>;
export type UpdateParticipationOutput = z.infer<
	typeof UpdateParticipationOutputSchema
>;

export const SittingParticipantMutationInputSchema = zod.object({
	slug: SittingSchema.shape.slug,
	userId: UserSchema.shape.id,
});

export const SittingParticipantMutationOutputSchema = zod.object({
	ok: zod.literal(true),
});

export type SittingParticipantMutationInput = z.infer<
	typeof SittingParticipantMutationInputSchema
>;
export type SittingParticipantMutationOutput = z.infer<
	typeof SittingParticipantMutationOutputSchema
>;

export const SendSittingTelegramProgressPollInputSchema = zod.object({
	slug: SittingSchema.shape.slug,
});

export const SendSittingTelegramProgressPollOutputSchema = zod.object({
	ok: zod.literal(true),
});

export const ResendSittingTelegramPollOpenInputSchema = zod.object({
	slug: SittingSchema.shape.slug,
});

export const ResendSittingTelegramPollOpenOutputSchema = zod.object({
	ok: zod.literal(true),
	sent: zod.boolean(),
});

export type SendSittingTelegramProgressPollInput = z.infer<
	typeof SendSittingTelegramProgressPollInputSchema
>;
export type SendSittingTelegramProgressPollOutput = z.infer<
	typeof SendSittingTelegramProgressPollOutputSchema
>;
export type ResendSittingTelegramPollOpenInput = z.infer<
	typeof ResendSittingTelegramPollOpenInputSchema
>;
export type ResendSittingTelegramPollOpenOutput = z.infer<
	typeof ResendSittingTelegramPollOpenOutputSchema
>;

export { refinePollConfig };
