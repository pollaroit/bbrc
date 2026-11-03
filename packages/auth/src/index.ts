import type { Database } from "@bbrc/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { AuthMailContext } from "./mail";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
};

export type CreateAuthOptions = {
	mail?: AuthMailContext;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	options: CreateAuthOptions = {},
) {
	const mail = options.mail;

	return betterAuth({
		database: prismaAdapter(database, {
			provider: "postgresql",
		}),
		trustedOrigins: [env.BETTER_AUTH_URL],
		emailVerification: {
			sendOnSignUp: true,
			sendVerificationEmail: mail
				? async ({ user, url }) => {
						await mail.mailer.sendTemplate({
							to: user.email,
							subject: "Confirm your email for BBRC",
							template: "verifyEmail",
							props: {
								name: user.name,
								verifyUrl: url,
							},
						});
					}
				: undefined,
			autoSignInAfterVerification: true,
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			minPasswordLength: 7,
			maxPasswordLength: 64,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: mail
				? async ({ user, url }) => {
						await mail.mailer.sendTemplate({
							to: user.email,
							subject: "Reset your BBRC password",
							template: "resetPassword",
							props: {
								name: user.name,
								resetUrl: url,
							},
						});
					}
				: undefined,
		},
		hooks: {
			after: mail
				? createAuthMiddleware(async (ctx) => {
						if (ctx.path !== "/change-password") {
							return;
						}
						try {
							const body = ctx.context.returned;
							if (
								!body ||
								typeof body !== "object" ||
								!("user" in body) ||
								!body.user ||
								typeof body.user !== "object" ||
								!("email" in body.user) ||
								!("name" in body.user)
							) {
								return;
							}
							const user = body.user as { email: string; name: string };
							await mail.mailer.sendTemplate({
								to: user.email,
								subject: "Your BBRC password was changed",
								template: "passwordChanged",
								props: { name: user.name },
							});
						} catch (error) {
							console.error("Could not send password-changed email", error);
						}
					})
				: undefined,
		},
		advanced: {
			database: {
				generateId: "uuid",
				joins: true,
			},
			backgroundTasks: {
				handler: (promise) => {
					void promise;
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [nextCookies()],
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						try {
							await database.shelf.create({
								data: {
									userId: user.id,
									slug: "wishlist",
									title: "Wishlist",
									description: "Books I want to read.",
									status: "active",
									type: "ordered",
									visibility: "private",
									isWishlist: true,
								},
							});
						} catch (error) {
							console.error("Could not create the wishlist shelf", error);
						}
					},
				},
			},
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					returned: true,
					defaultValue: "user",
					required: true,
					input: false,
				},
				username: {
					type: "string",
					returned: true,
					required: true,
					input: true,
					unique: true,
					index: true,
				},
			},
		},
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
