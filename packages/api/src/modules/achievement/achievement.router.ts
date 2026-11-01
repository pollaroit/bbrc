import {
	protectedProcedure,
	publicProcedure,
	superAdminProcedure,
} from "../../procedures";
import { audited } from "../audit/audit-middleware";
import { loadViewer } from "../visibility/viewer";
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
			listAchievements(
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	getBySlug: publicProcedure
		.input(GetAchievementInputSchema)
		.output(GetAchievementOutputSchema)
		.handler(async ({ input, context }) =>
			getAchievementBySlug(
				context.db,
				input.slug,
				await loadViewer(context.db, context.session),
			),
		),
	listEarners: publicProcedure
		.input(ListEarnersInputSchema)
		.output(ListEarnersOutputSchema)
		.handler(async ({ input, context }) =>
			listAchievementEarners(
				context.db,
				input,
				await loadViewer(context.db, context.session),
			),
		),
	listByUsername: publicProcedure
		.input(GetUserAchievementsInputSchema)
		.output(GetUserAchievementsOutputSchema)
		.handler(async ({ input, context }) =>
			getUserAchievements(
				context.db,
				input.username,
				await loadViewer(context.db, context.session),
			),
		),
	setShowcase: protectedProcedure
		.input(SetShowcaseInputSchema)
		.output(OkOutputSchema)
		.handler(async ({ input, context }) => {
			await setShowcase(context.db, context.session.user.id, input.awardIds);
			return { ok: true as const };
		}),
	revoke: superAdminProcedure
		.input(RevokeAchievementInputSchema)
		.use(
			audited("achievement.revoked", {
				before: ({ input, db }) =>
					db.userAchievement.findUnique({
						where: { id: input.awardId },
						select: {
							userId: true,
							achievementKey: true,
							user: { select: { name: true } },
						},
					}),
				target: ({ before, input }) => ({
					type: "member",
					id: before?.userId ?? input.awardId,
					label: before?.user.name,
				}),
				metadata: ({ before }) => ({ achievement: before?.achievementKey }),
			}),
		)
		.output(OkOutputSchema)
		.handler(async ({ input, context }) => {
			await revokeAchievement(context.db, input.awardId, input.reason);
			return { ok: true as const };
		}),
};
