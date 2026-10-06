import { adminProcedure } from "../../procedures";
import {
	AdminBookOverviewOutputSchema,
	GetAdminBookStatsInputSchema,
	GetAdminBookStatsOutputSchema,
	ListAdminBooksInputSchema,
	ListAdminBooksOutputSchema,
} from "./admin-book.schema";
import {
	getAdminBookOverview,
	getAdminBookStats,
	listAdminBooks,
} from "./admin-book.service";
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
	AdminUserOverviewOutputSchema,
	AdminUserStatsOutputSchema,
	GetAdminUserStatsInputSchema,
	ListAdminUsersInputSchema,
	ListAdminUsersOutputSchema,
} from "./admin-user.schema";
import {
	adminDeleteUser,
	adminSetUserPassword,
	adminUpdateUserName,
	adminUpdateUserRole,
	adminUpdateUserStatus,
	getAdminUserOverview,
	getAdminUserStats,
	listAdminUsers,
} from "./admin-user.service";

export const adminRouter = {
	getBookOverview: adminProcedure
		.output(AdminBookOverviewOutputSchema)
		.handler(async ({ context }) => getAdminBookOverview(context.db)),
	listBooks: adminProcedure
		.input(ListAdminBooksInputSchema)
		.output(ListAdminBooksOutputSchema)
		.handler(async ({ input, context }) => listAdminBooks(input, context.db)),
	getBookStats: adminProcedure
		.input(GetAdminBookStatsInputSchema)
		.output(GetAdminBookStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminBookStats(input, context.db),
		),
	getUserOverview: adminProcedure
		.output(AdminUserOverviewOutputSchema)
		.handler(async ({ context }) => getAdminUserOverview(context.db)),
	getUserStats: adminProcedure
		.input(GetAdminUserStatsInputSchema)
		.output(AdminUserStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminUserStats(input, context.db),
		),
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
