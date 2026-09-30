import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	RPEventSchema,
	SittingSchema,
	UserSchema,
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
	type GetPointsChartInput,
	GetPointsChartInputSchema,
	type GetPointsChartOutput,
	GetPointsChartOutputSchema,
};

export const RpEventListItemSchema = RPEventSchema.pick({
	id: true,
	createdAt: true,
	points: true,
}).extend({
	sittingSlug: SittingSchema.shape.slug,
	sittingTitle: zod.string().nullable(),
	rpBefore: zod.number().int(),
	rpAfter: zod.number().int(),
});

export const getRpEventListFields = {
	id: true,
	createdAt: true,
	points: true,
	sittingId: true,
	sitting: {
		select: {
			slug: true,
			selectedBook: {
				select: {
					title: true,
				},
			},
		},
	},
} as const;

export const GetRpEventListInputSchema = CursorPaginationInputSchema.extend({
	username: UserSchema.shape.username,
});

export const GetRpEventListOutputSchema = CursorPaginationOutputSchema(
	RpEventListItemSchema,
);

export type GetRpEventListInput = z.infer<typeof GetRpEventListInputSchema>;
export type GetRpEventListOutput = z.infer<typeof GetRpEventListOutputSchema>;

export const GetRpChartInputSchema = GetPointsChartInputSchema;
export const GetRpChartOutputSchema = GetPointsChartOutputSchema;

export type GetRpChartInput = z.infer<typeof GetRpChartInputSchema>;
export type GetRpChartOutput = z.infer<typeof GetRpChartOutputSchema>;

export const ApplyRpForFinishedSittingInputSchema = zod.object({
	sittingId: SittingSchema.shape.id,
	bookPages: zod.number().int().min(1),
});

export type ApplyRpForFinishedSittingInput = z.infer<
	typeof ApplyRpForFinishedSittingInputSchema
>;

export const RevertRpForDeletedSittingInputSchema = zod.object({
	sittingId: SittingSchema.shape.id,
});

export type RevertRpForDeletedSittingInput = z.infer<
	typeof RevertRpForDeletedSittingInputSchema
>;
