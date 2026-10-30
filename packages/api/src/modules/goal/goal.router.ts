import { notBannedProcedure, publicProcedure } from "../../procedures";
import { revalidateUserIsr } from "../../revalidate-isr";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	CreateGoalInputSchema,
	CreateGoalOutputSchema,
	GetGoalBySlugInputSchema,
	GetGoalBySlugOutputSchema,
	ListGoalsByUsernameInputSchema,
	ListGoalsByUsernameOutputSchema,
	UpdateGoalInputSchema,
	UpdateGoalOutputSchema,
} from "./goal.schema";
import {
	createGoal,
	getGoalBySlug,
	listGoalsByUsername,
	updateGoal,
} from "./goal.service";

export const goalRouter = {
	listByUsername: publicProcedure
		.input(ListGoalsByUsernameInputSchema)
		.output(ListGoalsByUsernameOutputSchema)
		.handler(async ({ input, context }) =>
			listGoalsByUsername(
				input.username,
				await loadViewer(context.db, context.session),
				context.db,
			),
		),
	getBySlug: publicProcedure
		.input(GetGoalBySlugInputSchema)
		.output(GetGoalBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getGoalBySlug(
				input.username,
				input.goalSlug,
				await loadViewer(context.db, context.session),
				context.db,
			),
		),
	create: notBannedProcedure
		.use(checkAchievementsAfter("goals"))
		.input(CreateGoalInputSchema)
		.output(CreateGoalOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await createGoal(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserIsr(context, context.session.user.username);
			return result;
		}),
	update: notBannedProcedure
		.input(UpdateGoalInputSchema)
		.output(UpdateGoalOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateGoal(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserIsr(context, context.session.user.username);
			return result;
		}),
};
