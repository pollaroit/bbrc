import {
	adminProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	GetAchievementInputSchema,
	GetAchievementOutputSchema,
	GetUserAchievementsInputSchema,
	GetUserAchievementsOutputSchema,
	ListAchievementsOutputSchema,
	ListEarnersInputSchema,
	ListEarnersOutputSchema,
	OkOutputSchema,
	RevokeAchievementInputSchema,
	SetShowcaseInputSchema,
} from "./achievement.schema";
import {
	getAchievementBySlug,
	getUserAchievements,
	listAchievementEarners,
	listAchievements,
	revokeAchievement,
	setShowcase,
} from "./achievement.service";

export const achievementRouter = {
	list: publicProcedure
		.output(ListAchievementsOutputSchema)
		.handler(async ({ context }) =>
			listAchievements(context.db, context.session),
		),
	getBySlug: publicProcedure
		.input(GetAchievementInputSchema)
		.output(GetAchievementOutputSchema)
		.handler(async ({ input, context }) =>
			getAchievementBySlug(context.db, input.slug, context.session),
		),
	listEarners: publicProcedure
		.input(ListEarnersInputSchema)
		.output(ListEarnersOutputSchema)
		.handler(async ({ input, context }) =>
			listAchievementEarners(context.db, input, context.session),
		),
	listByUsername: publicProcedure
		.input(GetUserAchievementsInputSchema)
		.output(GetUserAchievementsOutputSchema)
		.handler(async ({ input, context }) =>
			getUserAchievements(context.db, input.username, context.session),
		),
	setShowcase: protectedProcedure
		.input(SetShowcaseInputSchema)
		.output(OkOutputSchema)
		.handler(async ({ input, context }) => {
			await setShowcase(context.db, context.session.user.id, input.awardIds);
			return { ok: true as const };
		}),
	revoke: adminProcedure
		.input(RevokeAchievementInputSchema)
		.output(OkOutputSchema)
		.handler(async ({ input, context }) => {
			await revokeAchievement(context.db, input.awardId, input.reason);
			return { ok: true as const };
		}),
};
