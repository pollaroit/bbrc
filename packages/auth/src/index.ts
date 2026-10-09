import type { Database } from "@bbrc/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
};

export function createAuth(env: AuthConfig, database: Database) {
	return betterAuth({
		database: prismaAdapter(database, {
			provider: "postgresql",
		}),
		trustedOrigins: [env.BETTER_AUTH_URL],
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			minPasswordLength: 7,
			maxPasswordLength: 64,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [nextCookies()],
		user: {
			additionalFields: {
				isAdmin: {
					type: "boolean",
					returned: true,
					defaultValue: false,
					required: true,
					input: false,
				},
				status: {
					type: "string",
					returned: true,
					defaultValue: "active",
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
				telegramUserId: {
					type: "string",
					returned: true,
					required: false,
					input: false,
				},
				telegramUsername: {
					type: "string",
					returned: true,
					required: false,
					input: false,
				},
			},
		},
		advanced: {
			database: {
				generateId: "uuid",
				joins: true,
			},
		},
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
