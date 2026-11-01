import { protectedProcedure, publicProcedure } from "../../procedures";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	BeatReadingSessionInputSchema,
	CurrentReadingSessionInputSchema,
	CurrentReadingSessionOutputSchema,
	EndReadingSessionInputSchema,
	EndReadingSessionOutputSchema,
	ReadingPresenceInputSchema,
	ReadingPresenceOutputSchema,
	ReadingSessionSchema,
	ResumeReadingSessionInputSchema,
	SetSessionPagesInputSchema,
	StartFreeReadingSessionInputSchema,
	StartReadingSessionInputSchema,
} from "./reading-session.schema";
import {
	beatReadingSession,
	endReadingSession,
	getCurrentFreeReadingSession,
	getCurrentReadingSession,
	getReadingPresence,
	resumeReadingSession,
	setFreeSessionPages,
	startFreeReadingSession,
	startReadingSession,
} from "./reading-session.service";

export const readingSessionRouter = {
	current: protectedProcedure
		.input(CurrentReadingSessionInputSchema)
		.output(CurrentReadingSessionOutputSchema)
		.handler(async ({ input, context }) => ({
			session: await getCurrentReadingSession(
				context.db,
				context.session.user.id,
				input.readingId,
			),
		})),
	currentFree: protectedProcedure
		.output(CurrentReadingSessionOutputSchema)
		.handler(async ({ context }) => ({
			session: await getCurrentFreeReadingSession(
				context.db,
				context.session.user.id,
			),
		})),
	startFree: protectedProcedure
		.input(StartFreeReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			startFreeReadingSession(context.db, context.session.user.id, input),
		),
	setPages: protectedProcedure
		.input(SetSessionPagesInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			setFreeSessionPages(context.db, context.session.user.id, input),
		),
	start: protectedProcedure
		.input(StartReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			startReadingSession(context.db, context.session.user.id, input),
		),
	resume: protectedProcedure
		.input(ResumeReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			resumeReadingSession(context.db, context.session.user.id, input),
		),
	beat: protectedProcedure
		.input(BeatReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			beatReadingSession(context.db, context.session.user.id, input),
		),
	end: protectedProcedure
		.use(checkAchievementsAfter("reading"))
		.input(EndReadingSessionInputSchema)
		.output(EndReadingSessionOutputSchema)
		.handler(({ input, context }) =>
			endReadingSession(context.db, context.session.user.id, input),
		),
	presence: publicProcedure
		.input(ReadingPresenceInputSchema)
		.output(ReadingPresenceOutputSchema)
		.handler(async ({ input, context }) =>
			getReadingPresence(
				context.db,
				await loadViewer(context.db, context.session),
				input.bookSlug,
				input.liveClientIds,
			),
		),
};
