import { NOTIFICATION_KINDS } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

const NotificationKindSchema = zod.enum(NOTIFICATION_KINDS);

export const NotificationItemSchema = zod.object({
	id: zod.string().uuid(),
	kind: NotificationKindSchema,
	title: zod.string(),
	body: zod.string(),
	href: zod.string().nullable(),
	readAt: zod.coerce.date().nullable(),
	createdAt: zod.coerce.date(),
});

export const GetNotificationListInputSchema = zod.object({
	limit: zod.number().int().min(1).max(50).default(20),
	cursor: zod.string().uuid().optional(),
});

export const GetNotificationListOutputSchema = zod.object({
	items: zod.array(NotificationItemSchema),
	nextCursor: zod.string().uuid().nullable(),
});

export type GetNotificationListInput = z.infer<
	typeof GetNotificationListInputSchema
>;
export type GetNotificationListOutput = z.infer<
	typeof GetNotificationListOutputSchema
>;

export const GetUnreadNotificationCountOutputSchema = zod.object({
	count: zod.number().int().min(0),
});

export const MarkNotificationReadInputSchema = zod.object({
	id: zod.string().uuid(),
});

export const MarkNotificationReadOutputSchema = zod.object({
	ok: zod.literal(true),
});

export const MarkAllNotificationsReadOutputSchema = zod.object({
	ok: zod.literal(true),
});

export const NotificationPreferenceItemSchema = zod.object({
	kind: NotificationKindSchema,
	inAppEnabled: zod.boolean(),
	pushEnabled: zod.boolean(),
	group: zod.enum(["club", "personal", "sitting", "admin"]),
});

export const GetNotificationPreferencesOutputSchema = zod.object({
	preferences: zod.array(NotificationPreferenceItemSchema),
	telegram: zod.object({
		linked: zod.boolean(),
		sittingReadingReminderEnabled: zod.boolean(),
	}),
	ntfy: zod.object({
		baseUrl: zod.string(),
		userTopic: zod.string(),
		adminTopic: zod.string().nullable(),
		sittingTopics: zod.array(
			zod.object({
				sittingSlug: zod.string(),
				topic: zod.string(),
			}),
		),
	}),
});

export type GetNotificationPreferencesOutput = z.infer<
	typeof GetNotificationPreferencesOutputSchema
>;

export const UpdateNotificationPreferenceItemSchema = zod.object({
	kind: NotificationKindSchema,
	inAppEnabled: zod.boolean(),
	pushEnabled: zod.boolean(),
});

export const UpdateNotificationPreferencesInputSchema = zod.object({
	preferences: zod.array(UpdateNotificationPreferenceItemSchema),
	telegramSittingReadingReminderEnabled: zod.boolean().optional(),
});

export const UpdateNotificationPreferencesOutputSchema = zod.object({
	ok: zod.literal(true),
});

export type UpdateNotificationPreferencesInput = z.infer<
	typeof UpdateNotificationPreferencesInputSchema
>;

export type NotificationPreferenceUpdate = z.infer<
	typeof UpdateNotificationPreferenceItemSchema
>;
