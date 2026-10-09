import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	GetTelegramLinkStatusOutputSchema,
	LinkTelegramOutputSchema,
	TelegramLoginWidgetInputSchema,
	UnlinkTelegramOutputSchema,
} from "./telegram-link.schema";
import {
	getTelegramLinkStatus,
	linkTelegramAccount,
	unlinkTelegramAccount,
} from "./telegram-link.service";
import {
	GetUserByUsernameInputSchema,
	GetUserByUsernameOutputSchema,
	GetUserListInputSchema,
	GetUserListOutputSchema,
	GetUserParticipationListInputSchema,
	GetUserParticipationListOutputSchema,
} from "./user.schema";
import {
	getUserByUsername,
	getUserList,
	getUserParticipationList,
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
			async ({ input, context }) => await getUserByUsername(input, context.db),
		),
	getUserParticipationList: publicProcedure
		.input(GetUserParticipationListInputSchema)
		.output(GetUserParticipationListOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getUserParticipationList(input, context.db),
		),
	getTelegramLinkStatus: protectedProcedure
		.output(GetTelegramLinkStatusOutputSchema)
		.handler(async ({ context }) =>
			getTelegramLinkStatus(context.session.user.id, context.db),
		),
	linkTelegram: protectedProcedure
		.input(TelegramLoginWidgetInputSchema)
		.output(LinkTelegramOutputSchema)
		.handler(async ({ input, context }) =>
			linkTelegramAccount(context.session.user.id, input, context.db),
		),
	unlinkTelegram: protectedProcedure
		.output(UnlinkTelegramOutputSchema)
		.handler(async ({ context }) =>
			unlinkTelegramAccount(context.session.user.id, context.db),
		),
};
