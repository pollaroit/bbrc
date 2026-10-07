import zod from "zod";

const TelegramUserSchema = zod.object({
	id: zod.number(),
	username: zod.string().optional(),
	first_name: zod.string().optional(),
});

const TelegramChatSchema = zod.object({
	id: zod.number(),
	type: zod.string(),
});

const TelegramMessageSchema = zod.object({
	message_id: zod.number(),
	date: zod.number(),
	text: zod.string().optional(),
	chat: TelegramChatSchema,
	from: TelegramUserSchema.optional(),
});

export const TelegramUpdateSchema = zod.object({
	update_id: zod.number(),
	message: TelegramMessageSchema.optional(),
});

export type TelegramUpdate = zod.infer<typeof TelegramUpdateSchema>;
