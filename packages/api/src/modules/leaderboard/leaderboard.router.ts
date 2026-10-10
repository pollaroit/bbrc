import { publicProcedure } from "../../procedures";
import {
	GetLeaderboardHubInputSchema,
	GetLeaderboardHubOutputSchema,
	GetLeaderboardInputSchema,
	GetLeaderboardOutputSchema,
} from "./leaderboard.schema";
import { getLeaderboard, getLeaderboardHub } from "./leaderboard.service";

export const leaderboardRouter = {
	getLeaderboard: publicProcedure
		.input(GetLeaderboardInputSchema)
		.output(GetLeaderboardOutputSchema)
		.handler(async ({ input, context }) =>
			getLeaderboard(input, context.db, context.session?.user?.username),
		),
	getHub: publicProcedure
		.input(GetLeaderboardHubInputSchema)
		.output(GetLeaderboardHubOutputSchema)
		.handler(async ({ input, context }) =>
			getLeaderboardHub(input, context.db, context.session?.user?.username),
		),
};
