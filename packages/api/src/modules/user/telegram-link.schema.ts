import zod from "zod";

export const TelegramLoginWidgetInputSchema = zod.object({
	id: zod.number().int().positive(),
	first_name: zod.string().min(1),
	last_name: zod.string().optional(),
	username: zod.string().optional(),
	photo_url: zod.string().url().optional(),
	auth_date: zod.number().int().positive(),
	hash: zod.string().min(1),
});

export const GetTelegramLinkStatusOutputSchema = zod.object({
	linked: zod.boolean(),
	telegramUsername: zod.string().nullable(),
	telegramUserId: zod.string().nullable(),
});

export const LinkTelegramOutputSchema = GetTelegramLinkStatusOutputSchema;

export const UnlinkTelegramOutputSchema = zod.object({
	linked: zod.literal(false),
});

export type TelegramLoginWidgetInput = zod.infer<
	typeof TelegramLoginWidgetInputSchema
>;
export type GetTelegramLinkStatusOutput = zod.infer<
	typeof GetTelegramLinkStatusOutputSchema
>;
export type LinkTelegramOutput = zod.infer<typeof LinkTelegramOutputSchema>;
export type UnlinkTelegramOutput = zod.infer<typeof UnlinkTelegramOutputSchema>;
