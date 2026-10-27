import { validationMessage } from "@bbrc/i18n";
import { z } from "zod";

const READ_FINISHED_YEAR_MIN = 1000;
const READ_FINISHED_YEAR_MAX = 2100;

export const ReadFinishedMonthSchema = z.object({
	year: z
		.number()
		.int()
		.min(READ_FINISHED_YEAR_MIN)
		.max(READ_FINISHED_YEAR_MAX),
	month: z.number().int().min(1).max(12),
});

export type ReadFinishedMonth = z.infer<typeof ReadFinishedMonthSchema>;

/** API output: both null = unknown finish month. */
export const ReadFinishedMonthFieldSchema = ReadFinishedMonthSchema.nullable();

export type ReadFinishedMonthField = z.infer<
	typeof ReadFinishedMonthFieldSchema
>;

export const ReadFinishedMonthInputSchema = z
	.object({
		readEndYear: z
			.number()
			.int()
			.min(READ_FINISHED_YEAR_MIN)
			.max(READ_FINISHED_YEAR_MAX)
			.nullish(),
		readEndMonth: z.number().int().min(1).max(12).nullish(),
	})
	.superRefine((value, ctx) => {
		const hasYear = value.readEndYear != null;
		const hasMonth = value.readEndMonth != null;
		if (hasYear !== hasMonth) {
			ctx.addIssue({
				code: "custom",
				message: validationMessage("readFinish.monthAndYearTogether"),
				path: ["readEndMonth"],
			});
		}
	});

export type ReadFinishedMonthInput = z.infer<
	typeof ReadFinishedMonthInputSchema
>;

export function parseReadFinishedMonthField(input: {
	readEndYear: number | null;
	readEndMonth: number | null;
}): ReadFinishedMonthField {
	if (input.readEndYear == null && input.readEndMonth == null) {
		return null;
	}
	return ReadFinishedMonthSchema.parse({
		year: input.readEndYear,
		month: input.readEndMonth,
	});
}
