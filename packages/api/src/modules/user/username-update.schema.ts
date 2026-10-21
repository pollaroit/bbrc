import { UserSchema } from "@bbrc/schemas";
import zod from "zod";

export const GetUsernameUpdateStatusOutputSchema = zod.object({
	username: UserSchema.shape.username,
	usernameLastUpdatedAt: zod.coerce.date().nullable(),
	canUpdate: zod.boolean(),
	nextAllowedAt: zod.coerce.date().nullable(),
});

export type GetUsernameUpdateStatusOutput = zod.infer<
	typeof GetUsernameUpdateStatusOutputSchema
>;

export const UpdateUsernameInputSchema = zod.object({
	username: UserSchema.shape.username,
});

export const UpdateUsernameOutputSchema = zod.object({
	username: UserSchema.shape.username,
	usernameLastUpdatedAt: zod.coerce.date(),
});

export type UpdateUsernameInput = zod.infer<typeof UpdateUsernameInputSchema>;
export type UpdateUsernameOutput = zod.infer<typeof UpdateUsernameOutputSchema>;
