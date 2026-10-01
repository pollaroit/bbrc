import { publicProcedure } from "../../procedures";
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
};
