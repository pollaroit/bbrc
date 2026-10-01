import { adminProcedure } from "../../procedures";
import {
	AdminDeleteUserInputSchema,
	AdminDeleteUserOutputSchema,
	AdminSetUserPasswordInputSchema,
	AdminSetUserPasswordOutputSchema,
	AdminUpdateUserNameInputSchema,
	AdminUpdateUserNameOutputSchema,
	AdminUpdateUserRoleInputSchema,
	AdminUpdateUserRoleOutputSchema,
	AdminUpdateUserStatusInputSchema,
	AdminUpdateUserStatusOutputSchema,
	AdminUserStatsOutputSchema,
	ListAdminUsersInputSchema,
	ListAdminUsersOutputSchema,
} from "./admin-user.schema";
import {
	adminDeleteUser,
	adminSetUserPassword,
	adminUpdateUserName,
	adminUpdateUserRole,
	adminUpdateUserStatus,
	getAdminUserStats,
	listAdminUsers,
} from "./admin-user.service";

export const adminRouter = {
	getUserStats: adminProcedure
		.output(AdminUserStatsOutputSchema)
		.handler(async ({ context }) => getAdminUserStats(context.db)),
	listUsers: adminProcedure
		.input(ListAdminUsersInputSchema)
		.output(ListAdminUsersOutputSchema)
		.handler(async ({ input, context }) => listAdminUsers(input, context.db)),
	updateUserName: adminProcedure
		.input(AdminUpdateUserNameInputSchema)
		.output(AdminUpdateUserNameOutputSchema)
		.handler(async ({ input, context }) =>
			adminUpdateUserName(input, context.db),
		),
	updateUserRole: adminProcedure
		.input(AdminUpdateUserRoleInputSchema)
		.output(AdminUpdateUserRoleOutputSchema)
		.handler(async ({ input, context }) =>
			adminUpdateUserRole(input, context.session.user.id, context.db),
		),
	updateUserStatus: adminProcedure
		.input(AdminUpdateUserStatusInputSchema)
		.output(AdminUpdateUserStatusOutputSchema)
		.handler(async ({ input, context }) =>
			adminUpdateUserStatus(input, context.db),
		),
	deleteUser: adminProcedure
		.input(AdminDeleteUserInputSchema)
		.output(AdminDeleteUserOutputSchema)
		.handler(async ({ input, context }) =>
			adminDeleteUser(input, context.session.user.id, context.db),
		),
	setUserPassword: adminProcedure
		.input(AdminSetUserPasswordInputSchema)
		.output(AdminSetUserPasswordOutputSchema)
		.handler(async ({ input, context }) =>
			adminSetUserPassword(input, context.db),
		),
};
