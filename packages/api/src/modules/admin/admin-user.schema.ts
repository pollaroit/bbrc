import {
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
	passwordSchema,
	UserSchema,
	UserStatusSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
import zod from "zod";
import { UserPointsSchema } from "../user/user.schema";
import {
	adminUserListFiltersSchema,
	adminUserListRanging,
	adminUserListSearching,
	adminUserListSorting,
} from "./admin-user.listing";

export const AdminUserCountsSchema = zod.object({
	posts: zod.number().int().min(0),
	comments: zod.number().int().min(0),
	likes: zod.number().int().min(0),
	feedbacks: zod.number().int().min(0),
	participations: zod.number().int().min(0),
	reads: zod.number().int().min(0),
	favorites: zod.number().int().min(0),
	shelves: zod.number().int().min(0),
});

export const AdminUserRankingItemSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	metric: zod.number(),
	secondaryMetric: zod.number().optional(),
});

export const AdminUserOverviewOutputSchema = zod.object({
	kpis: zod.object({
		totalMembers: zod.number().int().min(0),
		admins: zod.number().int().min(0),
		active: zod.number().int().min(0),
		warned: zod.number().int().min(0),
		banned: zod.number().int().min(0),
		averageXp: zod.number(),
		averageRp: zod.number(),
		totalXp: UserPointsSchema,
		totalRp: UserPointsSchema,
		joinedLast7Days: zod.number().int().min(0),
		joinedLast30Days: zod.number().int().min(0),
		unverifiedEmail: zod.number().int().min(0),
		pendingBookRequests: zod.number().int().min(0),
	}),
	signupsByDay: zod.array(
		zod.object({
			date: zod.string(),
			count: zod.number().int().min(0),
		}),
	),
	rankings: zod.object({
		mostXp: zod.array(AdminUserRankingItemSchema),
		mostRp: zod.array(AdminUserRankingItemSchema),
		mostPosts: zod.array(AdminUserRankingItemSchema),
		mostComments: zod.array(AdminUserRankingItemSchema),
		mostLikes: zod.array(AdminUserRankingItemSchema),
		mostFeedbacks: zod.array(AdminUserRankingItemSchema),
		mostParticipations: zod.array(AdminUserRankingItemSchema),
		mostFavorites: zod.array(AdminUserRankingItemSchema),
		mostShelves: zod.array(AdminUserRankingItemSchema),
		mostBookRequests: zod.array(AdminUserRankingItemSchema),
		mostReads: zod.array(AdminUserRankingItemSchema),
		newestMembers: zod.array(AdminUserRankingItemSchema),
	}),
});

export type AdminUserOverviewOutput = z.infer<
	typeof AdminUserOverviewOutputSchema
>;

export const AdminUserListItemSchema = UserSchema.pick({
	id: true,
	email: true,
	isAdmin: true,
	isHidden: true,
	emailVerified: true,
	createdAt: true,
	updatedAt: true,
})
	.extend({
		username: zod.string(),
		name: zod.string(),
		image: UserSchema.shape.image,
		status: UserSchema.shape.status,
		xp: UserPointsSchema,
		rp: UserPointsSchema,
	})
	.extend({
		counts: AdminUserCountsSchema,
		telegramUserId: zod.string().nullable(),
		telegramUsername: zod.string().nullable(),
	});

const adminUserListQueryRefine = (
	value: {
		rangeMin?: Date;
		rangeMax?: Date;
		minReads?: number;
		maxReads?: number;
	},
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);

	if (
		value.maxReads != null &&
		value.minReads != null &&
		value.maxReads < value.minReads
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum reads must be greater than or equal to minimum",
			path: ["maxReads"],
		});
	}
};

export const ListAdminUsersInputSchema = adminUserListFiltersSchema
	.extend(OffsetPaginationInputSchema.shape)
	.extend(adminUserListSorting.inputSchema.shape)
	.extend(adminUserListRanging.inputSchema.shape)
	.extend(adminUserListSearching.inputSchema.shape)
	.superRefine(adminUserListQueryRefine);

export const ListAdminUsersOutputSchema = OffsetPaginationOutputSchema(
	AdminUserListItemSchema,
);

export type ListAdminUsersInput = z.infer<typeof ListAdminUsersInputSchema>;
export type ListAdminUsersOutput = z.infer<typeof ListAdminUsersOutputSchema>;

export const GetAdminUserOverviewInputSchema = adminUserListFiltersSchema
	.extend(adminUserListRanging.inputSchema.shape)
	.extend(adminUserListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminUserListQueryRefine)
	.default({});

export type GetAdminUserOverviewInput = z.infer<
	typeof GetAdminUserOverviewInputSchema
>;

export const GetAdminUserStatsInputSchema = zod
	.object({
		statuses: zod.array(UserStatusSchema).optional(),
		isAdmin: zod.boolean().optional(),
		rangeMin: zod.coerce.date().optional(),
		rangeMax: zod.coerce.date().optional(),
	})
	.partial()
	.default({});

export const AdminUserStatsPointSchema = zod.object({
	label: zod.string(),
	value: zod.number(),
});

export const AdminUserStatsOutputSchema = zod.object({
	statusDistribution: zod.array(
		zod.object({
			status: UserStatusSchema,
			count: zod.number().int().min(0),
		}),
	),
	signupsByDay: zod.array(
		zod.object({
			date: zod.string(),
			count: zod.number().int().min(0),
		}),
	),
	xpHistogram: zod.array(AdminUserStatsPointSchema),
	rpHistogram: zod.array(AdminUserStatsPointSchema),
	engagementFunnel: zod.array(
		zod.object({
			stage: zod.string(),
			count: zod.number().int().min(0),
		}),
	),
	activityTotals: zod.array(
		zod.object({
			kind: zod.string(),
			count: zod.number().int().min(0),
		}),
	),
	roleSplit: zod.array(
		zod.object({
			kind: zod.string(),
			count: zod.number().int().min(0),
		}),
	),
});

export type GetAdminUserStatsInput = z.infer<
	typeof GetAdminUserStatsInputSchema
>;
export type AdminUserStatsOutput = z.infer<typeof AdminUserStatsOutputSchema>;

export const AdminUpdateUserNameInputSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
});

export const AdminUpdateUserNameOutputSchema = UserSchema.pick({
	username: true,
	name: true,
});

export const AdminUpdateUserRoleInputSchema = zod.object({
	username: UserSchema.shape.username,
	isAdmin: UserSchema.shape.isAdmin,
});

export const AdminUpdateUserRoleOutputSchema = UserSchema.pick({
	username: true,
	isAdmin: true,
});

export const AdminUpdateUserStatusInputSchema = zod.object({
	username: UserSchema.shape.username,
	status: UserSchema.shape.status,
});

export const AdminUpdateUserStatusOutputSchema = UserSchema.pick({
	username: true,
	status: true,
});

export const AdminUpdateUserHiddenInputSchema = zod.object({
	username: UserSchema.shape.username,
	isHidden: zod.boolean(),
});

export const AdminUpdateUserHiddenOutputSchema = UserSchema.pick({
	username: true,
	isHidden: true,
});

export const AdminDeleteUserInputSchema = zod.object({
	username: UserSchema.shape.username,
});

export const AdminDeleteUserOutputSchema = zod.object({
	username: UserSchema.shape.username,
});

export const AdminSetUserPasswordInputSchema = zod.object({
	username: UserSchema.shape.username,
	password: passwordSchema,
});

export const AdminSetUserPasswordOutputSchema = zod.object({
	username: UserSchema.shape.username,
});

export type AdminUpdateUserNameInput = z.infer<
	typeof AdminUpdateUserNameInputSchema
>;
export type AdminUpdateUserNameOutput = z.infer<
	typeof AdminUpdateUserNameOutputSchema
>;
export type AdminUpdateUserRoleInput = z.infer<
	typeof AdminUpdateUserRoleInputSchema
>;
export type AdminUpdateUserRoleOutput = z.infer<
	typeof AdminUpdateUserRoleOutputSchema
>;
export type AdminUpdateUserStatusInput = z.infer<
	typeof AdminUpdateUserStatusInputSchema
>;
export type AdminUpdateUserStatusOutput = z.infer<
	typeof AdminUpdateUserStatusOutputSchema
>;
export type AdminUpdateUserHiddenInput = z.infer<
	typeof AdminUpdateUserHiddenInputSchema
>;
export type AdminUpdateUserHiddenOutput = z.infer<
	typeof AdminUpdateUserHiddenOutputSchema
>;
export type AdminDeleteUserInput = z.infer<typeof AdminDeleteUserInputSchema>;
export type AdminDeleteUserOutput = z.infer<typeof AdminDeleteUserOutputSchema>;
export type AdminSetUserPasswordInput = z.infer<
	typeof AdminSetUserPasswordInputSchema
>;
export type AdminSetUserPasswordOutput = z.infer<
	typeof AdminSetUserPasswordOutputSchema
>;

export const adminUserListSelect = {
	id: true,
	username: true,
	name: true,
	email: true,
	image: true,
	isAdmin: true,
	isHidden: true,
	status: true,
	xp: true,
	rp: true,
	emailVerified: true,
	telegramUserId: true,
	telegramUsername: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			posts: true,
			comments: true,
			likes: true,
			feedbacks: true,
			participations: true,
			reads: true,
			favorites: true,
			shelves: true,
		},
	},
} as const;
