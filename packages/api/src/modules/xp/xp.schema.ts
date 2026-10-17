import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	UserSchema,
	XPEventReasonSchema,
	XPEventSchema,
} from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";
import {
	type GetPointsChartInput,
	GetPointsChartInputSchema,
	type GetPointsChartOutput,
	GetPointsChartOutputSchema,
} from "../points/points-history";

export {
	type GetPointsChartInput as GetXpChartInput,
	GetPointsChartInputSchema as GetXpChartInputSchema,
	type GetPointsChartOutput as GetXpChartOutput,
	GetPointsChartOutputSchema as GetXpChartOutputSchema,
};

/** XP granted per event type (only increases; request wired later). */
export const XP_AWARD = {
	participation: 3,
	feedback: 5,
	vote: 1,
	post: 4,
	comment: 1,
	request: 2,
	shelf: 5,
	goal: 3,
} as const satisfies Record<z.infer<typeof XPEventReasonSchema>, number>;

export const REASON_LABELS: Record<
	z.infer<typeof XPEventReasonSchema>,
	string
> = {
	participation: "Participation",
	vote: "Poll vote",
	feedback: "Feedback",
	post: "Post",
	comment: "Comment",
	request: "Book request",
	shelf: "Shelf created",
	goal: "Goal created",
};

export const XpEventListItemSchema = XPEventSchema.pick({
	id: true,
	createdAt: true,
	points: true,
	reason: true,
}).extend({
	reasonLabel: zod.string(),
	sourceLabel: zod.string(),
	sourceHref: zod.string().nullable(),
	xpBefore: zod.number().int(),
	xpAfter: zod.number().int(),
});

export const getXpEventListFields = {
	id: true,
	createdAt: true,
	points: true,
	reason: true,
	entityId: true,
} as const;

export const GetXpEventListInputSchema = CursorPaginationInputSchema.extend({
	username: UserSchema.shape.username,
	reasons: zod.array(XPEventReasonSchema).optional(),
});

export const GetXpEventListOutputSchema = CursorPaginationOutputSchema(
	XpEventListItemSchema,
);

export type GetXpEventListInput = z.infer<typeof GetXpEventListInputSchema>;
export type GetXpEventListOutput = z.infer<typeof GetXpEventListOutputSchema>;

export const AwardParticipationXpInputSchema = zod.object({
	userId: UserSchema.shape.id,
	sittingId: zod.uuid("Invalid sitting id"),
});

export type AwardParticipationXpInput = z.infer<
	typeof AwardParticipationXpInputSchema
>;

export const AwardPollVoteXpInputSchema = zod.object({
	userId: UserSchema.shape.id,
	pollId: zod.uuid("Invalid poll id"),
});

export type AwardPollVoteXpInput = z.infer<typeof AwardPollVoteXpInputSchema>;

export const AwardFeedbackXpInputSchema = zod.object({
	userId: UserSchema.shape.id,
	feedbackId: zod.uuid("Invalid feedback id"),
});

export type AwardFeedbackXpInput = z.infer<typeof AwardFeedbackXpInputSchema>;

export const AwardPostXpInputSchema = zod.object({
	userId: UserSchema.shape.id,
	postId: zod.uuid("Invalid post id"),
});

export type AwardPostXpInput = z.infer<typeof AwardPostXpInputSchema>;

export const AwardCommentXpInputSchema = zod.object({
	userId: UserSchema.shape.id,
	commentId: zod.uuid("Invalid comment id"),
});

export type AwardCommentXpInput = z.infer<typeof AwardCommentXpInputSchema>;
