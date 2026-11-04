import { newPasswordIssues, PASSWORD_REQUIREMENTS } from "@bbrc/shared";
import z from "zod";
import { UserSchema } from "../generated/schemas/models";

export { PASSWORD_REQUIREMENTS };

export const passwordSchema = z.string().superRefine((value, ctx) => {
	for (const message of newPasswordIssues(value)) {
		ctx.addIssue({ code: "custom", message });
	}
});

export const SignupInputSchema = UserSchema.pick({
	name: true,
	username: true,
	email: true,
}).extend({
	password: passwordSchema,
});

export const SignInInputSchema = z.object({
	email: UserSchema.shape.email,
	password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof SignupInputSchema>;
export type SignInInput = z.infer<typeof SignInInputSchema>;
