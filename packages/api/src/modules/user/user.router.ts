import { adminProcedure, publicProcedure } from "../../procedures";
import {
	GetUserByUsernameInputSchema,
	GetUserByUsernameOutputSchema,
	GetUserListInputSchema,
	GetUserListOutputSchema,
	UpdateUserStatusInputSchema,
	UpdateUserStatusOutputSchema,
} from "./user.schema";
import {
	getUserByUsername,
	getUserList,
	updateUserStatus,
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
	updateUserStatus: adminProcedure
		.input(UpdateUserStatusInputSchema)
		.output(UpdateUserStatusOutputSchema)
		.handler(
			async ({ input, context }) => await updateUserStatus(input, context.db),
		),
};
