import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	ProgressSchema,
	SittingSchema,
	SittingStatusSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import type { z } from "zod";
import zod from "zod";
import {
	userListFiltersSchema,
	userListRanging,
	userListSearching,
	userListSorting,
} from "./user.listing";

/** LIST — composed as a concrete ZodObject so oRPC clients get input autocomplete. */
export const GetUserListInputSchema = userListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(userListSorting.inputSchema.shape)
	.extend(userListRanging.inputSchema.shape)
	.extend(userListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);
	});

export const getUserListFields = {
	id: true,
	username: true,
	name: true,
	image: true,
	isAdmin: true,
	rp: true,
	xp: true,
	status: true,
} as const;

export const GetUserListOutputSchema = CursorPaginationOutputSchema(
	UserSchema.pick(getUserListFields),
);

export type GetUserListInput = z.infer<typeof GetUserListInputSchema>;
export type GetUserListOutput = z.infer<typeof GetUserListOutputSchema>;

/** GET BY USERNAME */

export const getUserByUsernameFields = {
	username: true,
	name: true,
	image: true,
	isAdmin: true,
	rp: true,
	xp: true,
	status: true,
} as const;

export const GetUserByUsernameInputSchema = UserSchema.pick({
	username: true,
});

export const GetUserByUsernameOutputSchema = UserSchema.pick(
	getUserByUsernameFields,
).extend({
	indexable: zod.boolean(),
});

export type GetUserByUsernameInput = z.infer<
	typeof GetUserByUsernameInputSchema
>;

export type GetUserByUsernameOutput = z.infer<
	typeof GetUserByUsernameOutputSchema
>;

/** Profile card snapshot for the member profile dialog. */
export const ProfileCardBookSchema = BookSchema.pick({
	slug: true,
	title: true,
	coverId: true,
});

export const ProfileCardFavoriteItemSchema = zod.object({
	id: zod.string().uuid(),
	book: ProfileCardBookSchema,
});

export const ProfileCardReadItemSchema = zod.object({
	book: ProfileCardBookSchema,
});

export const ProfileCardStatsSchema = zod.object({
	readsCount: zod.number().int().min(0),
	feedbacksCount: zod.number().int().min(0),
	participationsCount: zod.number().int().min(0),
	shelvesCount: zod.number().int().min(0),
});

export const GetUserProfileCardInputSchema = UserSchema.pick({
	username: true,
});

export const GetUserProfileCardOutputSchema =
	GetUserByUsernameOutputSchema.omit({
		indexable: true,
	}).extend({
		favorites: zod.array(ProfileCardFavoriteItemSchema),
		recentReads: zod.array(ProfileCardReadItemSchema),
		stats: ProfileCardStatsSchema,
		generatedAt: zod.coerce.date(),
	});

export type GetUserProfileCardInput = z.infer<
	typeof GetUserProfileCardInputSchema
>;
export type GetUserProfileCardOutput = z.infer<
	typeof GetUserProfileCardOutputSchema
>;

export const UpdateUserStatusInputSchema = zod.object({
	username: UserSchema.shape.username,
	status: UserSchema.shape.status,
});

export const UpdateUserStatusOutputSchema = UserSchema.pick({
	username: true,
	status: true,
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusInputSchema>;
export type UpdateUserStatusOutput = z.infer<
	typeof UpdateUserStatusOutputSchema
>;

/** Participations for a member profile (readings tab). */
export const UserParticipationBookSchema = BookSchema.pick({
	slug: true,
	title: true,
	authors: true,
	coverId: true,
});

export const UserParticipationListItemSchema = zod.object({
	id: zod.uuid(),
	progress: ProgressSchema,
	updatedAt: zod.coerce.date(),
	sitting: zod.object({
		slug: SittingSchema.shape.slug,
		status: SittingStatusSchema,
		deadline: zod.coerce.date().nullable(),
		createdAt: zod.coerce.date(),
		displayName: zod.string().min(1),
		selectedBook: UserParticipationBookSchema.nullable(),
	}),
});

export const GetUserParticipationListInputSchema =
	CursorPaginationInputSchema.extend({
		username: UserSchema.shape.username,
	});

export const GetUserParticipationListOutputSchema =
	CursorPaginationOutputSchema(UserParticipationListItemSchema);

export type GetUserParticipationListInput = z.infer<
	typeof GetUserParticipationListInputSchema
>;
export type GetUserParticipationListOutput = z.infer<
	typeof GetUserParticipationListOutputSchema
>;

export const getUserParticipationListFields = {
	id: true,
	progress: true,
	updatedAt: true,
	sitting: {
		select: {
			slug: true,
			status: true,
			deadline: true,
			createdAt: true,
			selectedBook: {
				select: {
					slug: true,
					title: true,
					authors: true,
					coverId: true,
				},
			},
		},
	},
} as const;
