import { createAuth } from "@bbrc/auth";
import { createPrismaClient } from "@bbrc/db";
import { createMailer } from "@bbrc/email";

import { ENV } from "./env.server";
import { createAuthSecondaryStorage } from "./lib/redis";

if (ENV.NODE_ENV === "production" && !ENV.RESEND_API_KEY) {
	throw new Error("RESEND_API_KEY is required in production.");
}

export const db = createPrismaClient(ENV);

const resendApiKey =
	ENV.NODE_ENV === "production" ? ENV.RESEND_API_KEY : undefined;

const mailer = createMailer({
	from: `BBRC <${ENV.EMAIL_FROM}>`,
	resendApiKey,
	deliver: ENV.NODE_ENV === "production" && Boolean(resendApiKey),
});

const vercelOrigin = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
	: undefined;

export const auth = createAuth(ENV, db, {
	mail: { mailer },
	secondaryStorage: createAuthSecondaryStorage(),
	extraTrustedOrigins: vercelOrigin ? [vercelOrigin] : [],
});
