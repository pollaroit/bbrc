import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	BeginTelegramLinkOutputSchema,
	GetTelegramLinkStatusOutputSchema,
	UnlinkTelegramOutputSchema,
} from "./telegram-link.schema";
import {
	beginTelegramLinkChallenge,
	getTelegramLinkStatus,
	unlinkTelegramAccount,
} from "./telegram-link.service";
import {
	GetUserByUsernameInputSchema,
	GetUserByUsernameOutputSchema,
	GetUserListInputSchema,
	GetUserListOutputSchema,
	GetUserParticipationListInputSchema,
	GetUserParticipationListOutputSchema,
	GetUserProfileCardInputSchema,
	GetUserProfileCardOutputSchema,
} from "./user.schema";
import {
	getUserByUsername,
	getUserList,
	getUserParticipationList,
	getUserProfileCard,
} from "./user.service";

export const userRouter = {
	getUserList: publicProcedure
		.input(GetUserListInputSchema)
		.output(GetUserListOutputSchema)
		.handler(
			async ({ input, context }) => await getUserList(input, context.db),
		),
	getUserByUsername: publicProcedure
		.input(GetUserByUsernameInputSchema)
		.output(GetUserByUsernameOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getUserByUsername(input, context.db, context.session),
		),
	getUserProfileCard: publicProcedure
		.input(GetUserProfileCardInputSchema)
		.output(GetUserProfileCardOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getUserProfileCard(input, context.db, context.session),
		),
	getUserParticipationList: publicProcedure
		.input(GetUserParticipationListInputSchema)
		.output(GetUserParticipationListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getUserParticipationList(input, context.db, context.session),
		),
	getTelegramLinkStatus: protectedProcedure
		.output(GetTelegramLinkStatusOutputSchema)
		.handler(async ({ context }) =>
			getTelegramLinkStatus(context.session.user.id, context.db),
		),
	beginTelegramLink: protectedProcedure
		.output(BeginTelegramLinkOutputSchema)
		.handler(async ({ context }) =>
			beginTelegramLinkChallenge(context.session.user.id, context.db),
		),
	unlinkTelegram: protectedProcedure
		.output(UnlinkTelegramOutputSchema)
		.handler(async ({ context }) =>
			unlinkTelegramAccount(context.session.user.id, context.db),
		),
};
