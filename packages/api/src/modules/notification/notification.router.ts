import { protectedProcedure } from "../../procedures";
import {
	GetNotificationListInputSchema,
	GetNotificationListOutputSchema,
	GetNotificationPreferencesOutputSchema,
	GetUnreadNotificationCountOutputSchema,
	MarkAllNotificationsReadOutputSchema,
	MarkNotificationReadInputSchema,
	MarkNotificationReadOutputSchema,
	UpdateNotificationPreferencesInputSchema,
	UpdateNotificationPreferencesOutputSchema,
} from "./notification.schema";
import {
	getNotificationList,
	getNotificationPreferences,
	getUnreadNotificationCount,
	markAllNotificationsRead,
	markNotificationRead,
	updateNotificationPreferences,
} from "./notification.service";

export const notificationRouter = {
	getNotificationList: protectedProcedure
		.input(GetNotificationListInputSchema)
		.output(GetNotificationListOutputSchema)
		.handler(async ({ input, context }) =>
			getNotificationList(context.session.user.id, input, context.db),
		),
	getUnreadCount: protectedProcedure
		.output(GetUnreadNotificationCountOutputSchema)
		.handler(async ({ context }) =>
			getUnreadNotificationCount(context.session.user.id, context.db),
		),
	markRead: protectedProcedure
		.input(MarkNotificationReadInputSchema)
		.output(MarkNotificationReadOutputSchema)
		.handler(async ({ input, context }) =>
			markNotificationRead(context.session.user.id, input.id, context.db),
		),
	markAllRead: protectedProcedure
		.output(MarkAllNotificationsReadOutputSchema)
		.handler(async ({ context }) =>
			markAllNotificationsRead(context.session.user.id, context.db),
		),
	getPreferences: protectedProcedure
		.output(GetNotificationPreferencesOutputSchema)
		.handler(async ({ context }) =>
			getNotificationPreferences(
				context.session.user.id,
				context.session.user.isAdmin,
				context.db,
			),
		),
	updatePreferences: protectedProcedure
		.input(UpdateNotificationPreferencesInputSchema)
		.output(UpdateNotificationPreferencesOutputSchema)
		.handler(async ({ input, context }) =>
			updateNotificationPreferences(
				context.session.user.id,
				context.session.user.isAdmin,
				input,
				context.db,
			),
		),
};
