import {
	COUNTDOWN_MAX_MINUTES,
	COUNTDOWN_MIN_MINUTES,
	READING_SESSION_MAX_SECONDS,
	READING_SESSION_MODES,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

const ModeSchema = zod.enum(READING_SESSION_MODES);

export const StartReadingSessionInputSchema = zod.object({
	readingId: zod.string().min(1),
	mode: ModeSchema,
	targetMinutes: zod
		.number()
		.int()
		.min(COUNTDOWN_MIN_MINUTES)
		.max(COUNTDOWN_MAX_MINUTES)
		.nullish(),
});

export const BeatReadingSessionInputSchema = zod.object({
	sessionId: zod.string().min(1),
	/** Reading time so far, as the page counted it. The server holds it to what is possible. */
	activeSeconds: zod.number().int().min(0).max(READING_SESSION_MAX_SECONDS),
});

export const EndReadingSessionInputSchema = BeatReadingSessionInputSchema;

export const ResumeReadingSessionInputSchema = BeatReadingSessionInputSchema;

export const CurrentReadingSessionInputSchema = zod.object({
	readingId: zod.string().min(1),
});

export const ReadingSessionSchema = zod.object({
	id: zod.string(),
	readingId: zod.string(),
	startedAt: zod.coerce.date(),
	lastBeatAt: zod.coerce.date(),
	endedAt: zod.coerce.date().nullable(),
	activeSeconds: zod.number().int().min(0),
	mode: ModeSchema,
	targetMinutes: zod.number().int().nullable(),
	percentFrom: zod.number().int(),
	pageFrom: zod.number().int().nullable(),
});

export const CurrentReadingSessionOutputSchema = zod.object({
	session: ReadingSessionSchema.nullable(),
});

export const EndReadingSessionOutputSchema = ReadingSessionSchema.extend({
	percentTo: zod.number().int(),
	pageTo: zod.number().int().nullable(),
	/** Days in a row with reading logged, counting today. */
	streakDays: zod.number().int().min(0),
});

export const ReadingPresenceInputSchema = zod.object({
	bookSlug: zod.string().min(1),
});

export const ReadingPresenceOutputSchema = zod.object({
	/** Everyone reading this book in Reading Mode right now, however they set their privacy. */
	count: zod.number().int().min(0),
	/** The viewer is one of them. */
	viewerPresent: zod.boolean(),
	/** Those who show what they are reading, without the viewer. */
	readers: zod.array(
		zod.object({
			username: zod.string(),
			name: zod.string(),
			image: zod.string().nullable(),
		}),
	),
});

export type StartReadingSessionInput = z.infer<
	typeof StartReadingSessionInputSchema
>;
export type ReadingSessionView = z.infer<typeof ReadingSessionSchema>;
export type EndReadingSessionOutput = z.infer<
	typeof EndReadingSessionOutputSchema
>;
export type ReadingPresenceOutput = z.infer<typeof ReadingPresenceOutputSchema>;
