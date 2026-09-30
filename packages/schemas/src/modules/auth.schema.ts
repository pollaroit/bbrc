import z from "zod";
import { UserSchema } from "../generated/schemas/models";

export const passwordSchema = z
	.string()
	.min(7, "Password must be at least 7 characters long")
	.max(64, "Password must be at most 64 characters long")
	.regex(
		/^(?=.*[a-zA-Z])(?=.*\d).+$/,
		"Password must contain at least one letter and one digit",
	);

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
