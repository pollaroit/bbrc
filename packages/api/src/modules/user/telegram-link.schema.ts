import zod from "zod";

export const GetTelegramLinkStatusOutputSchema = zod.object({
	linked: zod.boolean(),
	telegramUsername: zod.string().nullable(),
	telegramUserId: zod.string().nullable(),
});

export const BeginTelegramLinkOutputSchema = zod.object({
	url: zod.string().url(),
	expiresAt: zod.string(),
});

export const UnlinkTelegramOutputSchema = zod.object({
	linked: zod.literal(false),
});

export type GetTelegramLinkStatusOutput = zod.infer<
	typeof GetTelegramLinkStatusOutputSchema
>;
export type BeginTelegramLinkOutput = zod.infer<
	typeof BeginTelegramLinkOutputSchema
>;
export type UnlinkTelegramOutput = zod.infer<typeof UnlinkTelegramOutputSchema>;
