import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
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
);

export type GetUserByUsernameInput = z.infer<
	typeof GetUserByUsernameInputSchema
>;

export type GetUserByUsernameOutput = z.infer<
	typeof GetUserByUsernameOutputSchema
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
