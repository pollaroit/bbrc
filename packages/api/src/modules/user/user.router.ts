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
import {
	GetMyPreferencesOutputSchema,
	UpdateMyPreferencesInputSchema,
	UpdateMyPreferencesOutputSchema,
} from "./user-preferences.schema";
import {
	getMyPreferences,
	updateMyPreferences,
} from "./user-preferences.service";
import {
	GetMyProfileOutputSchema,
	UpdateMyProfileInputSchema,
	UpdateMyProfileOutputSchema,
} from "./user-profile.schema";
import { getProfileByUserId, updateMyProfile } from "./user-profile.service";
import {
	GetUserStatsInputSchema,
	GetUserStatsOutputSchema,
} from "./user-stats.schema";
import { getUserStats } from "./user-stats.service";
import {
	GetUsernameUpdateStatusOutputSchema,
	UpdateNameInputSchema,
	UpdateNameOutputSchema,
	UpdateUsernameInputSchema,
	UpdateUsernameOutputSchema,
} from "./username-update.schema";
import {
	getUsernameUpdateStatus,
	updateName,
	updateUsername,
} from "./username-update.service";

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
	getUserStats: publicProcedure
		.input(GetUserStatsInputSchema)
		.output(GetUserStatsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getUserStats(input, context.db, context.session),
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
	getUsernameUpdateStatus: protectedProcedure
		.output(GetUsernameUpdateStatusOutputSchema)
		.handler(async ({ context }) =>
			getUsernameUpdateStatus(context.session.user.id, context.db),
		),
	updateUsername: protectedProcedure
		.input(UpdateUsernameInputSchema)
		.output(UpdateUsernameOutputSchema)
		.handler(async ({ input, context }) =>
			updateUsername(context.session.user.id, input, context.db),
		),
	updateName: protectedProcedure
		.input(UpdateNameInputSchema)
		.output(UpdateNameOutputSchema)
		.handler(async ({ input, context }) =>
			updateName(context.session.user.id, input, context.db),
		),
	getMyProfile: protectedProcedure
		.output(GetMyProfileOutputSchema)
		.handler(async ({ context }) =>
			getProfileByUserId(context.session.user.id, context.db),
		),
	getMyPreferences: protectedProcedure
		.output(GetMyPreferencesOutputSchema)
		.handler(async ({ context }) =>
			getMyPreferences(context.session.user.id, context.db),
		),
	updateMyPreferences: protectedProcedure
		.input(UpdateMyPreferencesInputSchema)
		.output(UpdateMyPreferencesOutputSchema)
		.handler(async ({ input, context }) =>
			updateMyPreferences(context.session.user.id, input, context.db),
		),
	updateMyProfile: protectedProcedure
		.input(UpdateMyProfileInputSchema)
		.output(UpdateMyProfileOutputSchema)
		.handler(async ({ input, context }) =>
			updateMyProfile(context.session.user.id, input, context.db),
		),
};
