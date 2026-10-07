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
import { isSlug, SLUG_MAX_LENGTH } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";
import {
	BookWithRequestedBySchema,
	getBookListFields,
	getBookPollSelect,
} from "../book/book.schema";
import {
	sittingListFiltersSchema,
	sittingListRanging,
	sittingListSearching,
	sittingListSorting,
} from "./sitting.listing";

/** Deadlines read from the DB (create/update inputs still use Prisma “future” refines). */
const SittingStoredDeadlineSchema = zod.coerce.date();
const PollStoredDeadlineSchema = zod.coerce.date();

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
	take: true,
	minChoices: true,
	maxChoices: true,
}).extend({
	deadline: PollStoredDeadlineSchema,
});

export const SittingPollOptionBookSchema = BookWithRequestedBySchema;

export const SittingPollOptionSchema = zod.object({
	id: zod.uuid(),
	voteCount: zod.number().int().min(0),
	book: SittingPollOptionBookSchema,
});

export const SittingPollDetailSchema = SittingPollSummarySchema.extend({
	options: zod.array(SittingPollOptionSchema),
	myVoteOptionIds: zod.array(zod.uuid()),
	voterCount: zod.number().int().min(0),
});

export const SittingParticipantSummarySchema = zod.object({
	userId: UserSchema.shape.id,
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	status: UserSchema.shape.status,
	progress: ProgressSchema,
	rpChange: zod.number().int().nullable(),
});

export const SittingRemovedParticipantSchema =
	SittingParticipantSummarySchema.extend({
		removedAt: zod.coerce.date(),
	});

export const SittingSelectedBookSchema = BookSchema.pick(getBookListFields);

export const SittingReviewSummarySchema = zod.object({
	slug: FeedbackSchema.shape.slug,
	authorId: UserSchema.shape.id,
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	rating: zod.number().min(0).max(5),
	review: zod.string().min(1).max(500),
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
	poll: SittingPollDetailSchema.nullable(),
	selectedBook: SittingSelectedBookSchema.nullable(),
	reviews: zod.array(SittingReviewSummarySchema),
	participants: zod.array(SittingParticipantSummarySchema),
	removedParticipants: zod.array(SittingRemovedParticipantSchema),
});

export type GetSittingBySlugOutput = z.infer<
	typeof GetSittingBySlugOutputSchema
>;

/** ONGOING — at most one sitting in voting or reading */
export const GetOngoingSittingOutputSchema = SittingSchema.pick({
	slug: true,
	status: true,
	createdAt: true,
})
	.extend({
		deadline: SittingStoredDeadlineSchema,
		participantCount: zod.number().int().min(0),
		pollDeadline: PollStoredDeadlineSchema.nullable(),
		selectedBookTitle: zod.string().nullable(),
		viewerIsParticipant: zod.boolean(),
	})
	.nullable();

export type GetOngoingSittingOutput = z.infer<
	typeof GetOngoingSittingOutputSchema
>;

export const SubmitPollVotesInputSchema = zod.object({
	sittingSlug: SittingSchema.shape.slug,
	optionIds: zod.array(zod.uuid()).min(1),
});

export const SubmitPollVotesOutputSchema = zod.object({
	myVoteOptionIds: zod.array(zod.uuid()),
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

export const GetPollVotesByUserInputSchema = zod.object({
	sittingSlug: SittingSchema.shape.slug,
});

export const PollVoteByUserChoiceSchema = zod.object({
	pollOptionId: zod.uuid(),
	bookTitle: zod.string(),
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

export type SendSittingTelegramProgressPollInput = z.infer<
	typeof SendSittingTelegramProgressPollInputSchema
>;
export type SendSittingTelegramProgressPollOutput = z.infer<
	typeof SendSittingTelegramProgressPollOutputSchema
>;

export { refinePollConfig };
