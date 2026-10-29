import { notBannedProcedure, publicProcedure } from "../../procedures";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
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
	StartReadingSessionInputSchema,
} from "./reading-session.schema";
import {
	beatReadingSession,
	endReadingSession,
	getCurrentReadingSession,
	getReadingPresence,
	resumeReadingSession,
	startReadingSession,
} from "./reading-session.service";

export const readingSessionRouter = {
	current: notBannedProcedure
		.input(CurrentReadingSessionInputSchema)
		.output(CurrentReadingSessionOutputSchema)
		.handler(async ({ input, context }) => ({
			session: await getCurrentReadingSession(
				context.db,
				context.session.user.id,
				input.readingId,
			),
		})),
	start: notBannedProcedure
		.input(StartReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			startReadingSession(context.db, context.session.user.id, input),
		),
	resume: notBannedProcedure
		.input(ResumeReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			resumeReadingSession(context.db, context.session.user.id, input),
		),
	beat: notBannedProcedure
		.input(BeatReadingSessionInputSchema)
		.output(ReadingSessionSchema)
		.handler(({ input, context }) =>
			beatReadingSession(context.db, context.session.user.id, input),
		),
	end: notBannedProcedure
		.use(checkAchievementsAfter("reading"))
		.input(EndReadingSessionInputSchema)
		.output(EndReadingSessionOutputSchema)
		.handler(({ input, context }) =>
			endReadingSession(context.db, context.session.user.id, input),
		),
	presence: publicProcedure
		.input(ReadingPresenceInputSchema)
		.output(ReadingPresenceOutputSchema)
		.handler(({ input, context }) =>
			getReadingPresence(
				context.db,
				context.session?.user.id ?? null,
				input.bookSlug,
			),
		),
};
