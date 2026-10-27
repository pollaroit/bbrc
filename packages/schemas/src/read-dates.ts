import { validationMessage } from "@bbrc/i18n";
import { z } from "zod";

const READ_DATE_YEAR_MIN = 1000;
const READ_DATE_YEAR_MAX = 2100;

function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Partial calendar date: year only, year+month, or full date. */
export const ReadDatePartSchema = z
	.object({
		year: z.number().int().min(READ_DATE_YEAR_MIN).max(READ_DATE_YEAR_MAX),
		month: z.number().int().min(1).max(12).optional(),
		day: z.number().int().min(1).max(31).optional(),
	})
	.superRefine((value, ctx) => {
		if (value.day != null && value.month == null) {
			ctx.addIssue({
				code: "custom",
				message: validationMessage("readDates.dayNeedsMonth"),
				path: ["day"],
			});
		}

		if (
			value.month != null &&
			value.day != null &&
			value.day > daysInMonth(value.year, value.month)
		) {
			ctx.addIssue({
				code: "custom",
				message: validationMessage("readDates.invalidDay"),
				path: ["day"],
			});
		}
	});

export type ReadDatePart = z.infer<typeof ReadDatePartSchema>;

export const ReadPeriodSchema = z
	.object({
		start: ReadDatePartSchema.nullish(),
		end: ReadDatePartSchema.nullish(),
	})
	.superRefine((value, ctx) => {
		if (!value.start && !value.end) {
			return;
		}

		const startKey = value.start ? dateSortKey(value.start) : null;
		const endKey = value.end ? dateSortKey(value.end) : null;

		if (startKey != null && endKey != null && startKey > endKey) {
			ctx.addIssue({
				code: "custom",
				message: validationMessage("readDates.endBeforeStart"),
				path: ["end"],
			});
		}
	});

export type ReadPeriod = z.infer<typeof ReadPeriodSchema>;

/** Stored on `Read.readStart` / `Read.readEnd` (each side optional). */
export const ReadDateFieldSchema = ReadDatePartSchema.nullish();

export type ReadDateField = z.infer<typeof ReadDateFieldSchema>;

function dateSortKey(part: ReadDatePart): number {
	const month = part.month ?? 1;
	const day = part.day ?? 1;
	return part.year * 10_000 + month * 100 + day;
}

export function parseReadDateField(value: unknown): ReadDateField {
	if (value == null) {
		return null;
	}
	return ReadDateFieldSchema.parse(value);
}

export function parseReadDateFields(input: {
	readStart?: unknown;
	readEnd?: unknown;
}): { readStart: ReadDateField; readEnd: ReadDateField } {
	return {
		readStart: parseReadDateField(input.readStart),
		readEnd: parseReadDateField(input.readEnd),
	};
}
