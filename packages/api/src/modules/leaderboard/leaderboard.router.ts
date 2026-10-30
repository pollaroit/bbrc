import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
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
			getLeaderboard(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	getHub: publicProcedure
		.input(GetLeaderboardHubInputSchema)
		.output(GetLeaderboardHubOutputSchema)
		.handler(async ({ input, context }) =>
			getLeaderboardHub(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
};
