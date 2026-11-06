import type { Database } from "@bbrc/db";
import {
	isReservedKeyword,
	isValidNewPassword,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_REQUIREMENTS,
	RESERVED_USERNAME_MESSAGE,
} from "@bbrc/shared";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { AuthMailContext } from "./mail";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_TRUSTED_ORIGINS?: string;
	NODE_ENV?: string;
};

export type AuthSecondaryStorage = {
	get: (key: string) => Promise<string | null>;
	getAndDelete: (key: string) => Promise<string | null>;
	increment: (key: string, ttl: number) => Promise<number>;
	set: (key: string, value: string, ttl?: number) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

export type CreateAuthOptions = {
	mail?: AuthMailContext;
	secondaryStorage?: AuthSecondaryStorage;
	extraTrustedOrigins?: string[];
};

const NEW_PASSWORD_PATHS = new Set([
	"/sign-up/email",
	"/change-password",
	"/reset-password",
]);

function parseOriginList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((part) => part.trim().replace(/\/$/, ""))
		.filter(Boolean);
}

function trustedOrigins(env: AuthConfig, extra: string[] = []): string[] {
	return [
		...new Set([
			...parseOriginList(env.BETTER_AUTH_URL),
			...parseOriginList(env.BETTER_AUTH_TRUSTED_ORIGINS),
			...extra.flatMap((origin) => parseOriginList(origin)),
		]),
	];
}

function passwordFromBody(body: unknown): string | undefined {
	if (!body || typeof body !== "object") return undefined;
	const record = body as Record<string, unknown>;
	if (typeof record.newPassword === "string") return record.newPassword;
	if (typeof record.password === "string") return record.password;
	return undefined;
}

function usernameFromBody(body: unknown): string | undefined {
	if (!body || typeof body !== "object") return undefined;
	const username = (body as Record<string, unknown>).username;
	return typeof username === "string" ? username : undefined;
}

export function createAuth(
	env: AuthConfig,
	database: Database,
	options: CreateAuthOptions = {},
) {
	const mail = options.mail;
	const production = env.NODE_ENV === "production";

	return betterAuth({
		database: prismaAdapter(database, {
			provider: "postgresql",
		}),
		trustedOrigins: trustedOrigins(env, options.extraTrustedOrigins),
		secondaryStorage: options.secondaryStorage,
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
			storeSessionInDatabase: true,
			cookieCache: {
				enabled: true,
				maxAge: 60 * 5,
			},
		},
		rateLimit: {
			enabled: true,
			storage: options.secondaryStorage ? "secondary-storage" : "memory",
			window: 60,
			// A generous default: the browser talks to these endpoints on its own (session
			// checks on focus, profile saves), so a low ceiling answers ordinary use with
			// "Too many requests". Anything that can be abused for guessing has its own,
			// strict rule below (and the library's built-in ones for sign-in, sign-up,
			// password and email changes).
			max: 300,
			customRules: {
				// Reading who is signed in is cheap (cookie cached) and every tab, focus and page
				// asks for it; limiting it made ordinary use answer "Too many requests".
				"/get-session": false,
				"/sign-in/email": { window: 60, max: 5 },
				"/sign-up/email": { window: 60, max: 3 },
				"/forget-password/email": { window: 60, max: 3 },
				"/request-password-reset": { window: 60, max: 3 },
			},
		},
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
			minPasswordLength: PASSWORD_MIN_LENGTH,
			maxPasswordLength: PASSWORD_MAX_LENGTH,
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
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/sign-up/email") {
					const username = usernameFromBody(ctx.body);
					if (
						username !== undefined &&
						isReservedKeyword(username.toLowerCase())
					) {
						throw new APIError("BAD_REQUEST", {
							message: RESERVED_USERNAME_MESSAGE,
						});
					}
				}
				if (!NEW_PASSWORD_PATHS.has(ctx.path)) {
					return;
				}
				const password = passwordFromBody(ctx.body);
				if (password !== undefined && !isValidNewPassword(password)) {
					throw new APIError("BAD_REQUEST", {
						message: PASSWORD_REQUIREMENTS,
					});
				}
			}),
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
			// One bucket per person, not per site: without a resolvable address the limiter
			// puts every visitor in one shared bucket. Vercel's header is set by the platform.
			ipAddress: {
				ipAddressHeaders: [
					"x-vercel-forwarded-for",
					"x-real-ip",
					"x-forwarded-for",
				],
			},
			useSecureCookies: production,
			defaultCookieAttributes: {
				httpOnly: true,
				sameSite: "lax",
				secure: production,
			},
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
