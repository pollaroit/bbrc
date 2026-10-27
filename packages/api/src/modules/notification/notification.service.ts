import type { Database } from "@bbrc/db";
import { type Locale, withLocalePrefix } from "@bbrc/i18n";
import {
	defaultPushEnabledForKind,
	isOffByDefaultKind,
	NOTIFICATION_KIND_GROUPS,
	NOTIFICATION_KINDS,
	type NotificationKind,
} from "@bbrc/shared";
import type { NotificationKind as DbNotificationKind } from "../../../../db/prisma/generated/enums";
import { recipientLocale } from "../../lib/locale";
import {
	ntfyAdminTopic,
	ntfySittingTopic,
	ntfyUserTopic,
	publishNtfy,
	resolveNtfyConfig,
} from "../../lib/ntfy";
import { currentLocale } from "../../lib/request-locale";
import type {
	GetNotificationListInput,
	GetNotificationListOutput,
	GetNotificationPreferencesOutput,
	UpdateNotificationPreferencesInput,
} from "./notification.schema";
import {
	type NotificationMessageId,
	type NotificationValues,
	notificationText,
	renderStoredNotification,
} from "./notification-text";

function kindToDb(kind: NotificationKind): DbNotificationKind {
	return kind as DbNotificationKind;
}

function preferenceGroup(
	kind: NotificationKind,
): "club" | "personal" | "sitting" | "admin" {
	if ((NOTIFICATION_KIND_GROUPS.admin as readonly string[]).includes(kind)) {
		return "admin";
	}
	if ((NOTIFICATION_KIND_GROUPS.sitting as readonly string[]).includes(kind)) {
		return "sitting";
	}
	if ((NOTIFICATION_KIND_GROUPS.personal as readonly string[]).includes(kind)) {
		return "personal";
	}
	return "club";
}

export async function ensureNotificationPreferences(
	userId: string,
	db: Database,
): Promise<void> {
	const existing = await db.notificationPreference.findMany({
		where: { userId },
		select: { kind: true },
	});
	const existingKinds = new Set(existing.map((row) => row.kind));
	const missing = NOTIFICATION_KINDS.filter(
		(kind) => !existingKinds.has(kindToDb(kind)),
	);

	if (missing.length === 0) {
		return;
	}

	await db.notificationPreference.createMany({
		data: missing.map((kind) => ({
			userId,
			kind: kindToDb(kind),
			inAppEnabled: !isOffByDefaultKind(kind),
			pushEnabled: !isOffByDefaultKind(kind) && defaultPushEnabledForKind(kind),
		})),
		// Two notices at once (a new book also tells the author's followers) can both find the
		// same rows missing; the second must not fail on the first one's insert.
		skipDuplicates: true,
	});
}

function resolvePublicAppOrigin(): string {
	const authUrl = process.env.BETTER_AUTH_URL?.trim();
	if (authUrl) {
		return authUrl.replace(/\/$/, "");
	}
	const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
	if (vercel) {
		return vercel.startsWith("http")
			? vercel.replace(/\/$/, "")
			: `https://${vercel}`;
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
	}
	return "http://localhost:3001";
}

export async function getNotificationPreferences(
	userId: string,
	isAdmin: boolean,
	db: Database,
): Promise<GetNotificationPreferencesOutput> {
	await ensureNotificationPreferences(userId, db);

	const [rows, user] = await Promise.all([
		db.notificationPreference.findMany({
			where: { userId },
			orderBy: { kind: "asc" },
		}),
		db.user.findUnique({
			where: { id: userId },
			select: {
				telegramUserId: true,
				telegramSittingReadingReminderEnabled: true,
			},
		}),
	]);

	const participations = await db.participation.findMany({
		where: {
			userId,
			sitting: { status: { in: ["voting", "reading"] } },
		},
		select: { sitting: { select: { slug: true } } },
	});

	const ntfy = resolveNtfyConfig();
	const prefix = ntfy?.topicPrefix ?? "bbrc";
	const baseUrl = ntfy?.baseUrl ?? "https://ntfy.sh";

	const preferences = rows
		.filter((row) => isAdmin || row.kind !== "book_requested")
		.map((row) => {
			const kind = row.kind as NotificationKind;
			return {
				kind,
				inAppEnabled: row.inAppEnabled,
				pushEnabled: row.pushEnabled,
				group: preferenceGroup(kind),
			};
		});

	return {
		preferences,
		telegram: {
			linked: user?.telegramUserId != null,
			sittingReadingReminderEnabled:
				user?.telegramSittingReadingReminderEnabled ?? true,
		},
		ntfy: {
			baseUrl,
			userTopic: ntfyUserTopic(prefix, userId),
			adminTopic: isAdmin ? ntfyAdminTopic(prefix) : null,
			sittingTopics: participations.map(({ sitting }) => ({
				sittingSlug: sitting.slug,
				topic: ntfySittingTopic(prefix, sitting.slug),
			})),
		},
	};
}

export async function updateNotificationPreferences(
	userId: string,
	isAdmin: boolean,
	input: UpdateNotificationPreferencesInput,
	db: Database,
): Promise<{ ok: true }> {
	await ensureNotificationPreferences(userId, db);

	for (const pref of input.preferences) {
		if (!isAdmin && pref.kind === "book_requested") {
			continue;
		}

		await db.notificationPreference.update({
			where: {
				userId_kind: { userId, kind: kindToDb(pref.kind) },
			},
			data: {
				inAppEnabled: pref.inAppEnabled,
				pushEnabled: pref.pushEnabled,
			},
		});
	}

	if (input.telegramSittingReadingReminderEnabled !== undefined) {
		await db.user.update({
			where: { id: userId },
			data: {
				telegramSittingReadingReminderEnabled:
					input.telegramSittingReadingReminderEnabled,
			},
		});
	}

	return { ok: true };
}

export async function getNotificationList(
	userId: string,
	input: GetNotificationListInput,
	db: Database,
	locale: Locale = currentLocale(),
): Promise<GetNotificationListOutput> {
	const rows = await db.notification.findMany({
		where: { userId },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		...(input.cursor
			? {
					cursor: { id: input.cursor },
					skip: 1,
				}
			: {}),
		take: input.limit + 1,
		select: {
			id: true,
			kind: true,
			title: true,
			body: true,
			href: true,
			params: true,
			readAt: true,
			createdAt: true,
		},
	});

	const hasMore = rows.length > input.limit;
	const items = hasMore ? rows.slice(0, input.limit) : rows;

	return {
		items: items.map((row) => {
			// A row with parameters is turned into words in the reader's language now; an older
			// row (no parameters) is shown as it was saved, in English.
			const text = renderStoredNotification(row, locale);
			return {
				id: row.id,
				kind: row.kind as NotificationKind,
				title: text.title,
				body: text.body,
				href: row.href,
				readAt: row.readAt,
				createdAt: row.createdAt,
			};
		}),
		nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
	};
}

export async function getUnreadNotificationCount(
	userId: string,
	db: Database,
): Promise<{ count: number }> {
	const count = await db.notification.count({
		where: { userId, readAt: null },
	});
	return { count };
}

export async function markNotificationRead(
	userId: string,
	notificationId: string,
	db: Database,
): Promise<{ ok: true }> {
	await db.notification.updateMany({
		where: { id: notificationId, userId },
		data: { readAt: new Date() },
	});
	return { ok: true };
}

export async function markAllNotificationsRead(
	userId: string,
	db: Database,
): Promise<{ ok: true }> {
	await db.notification.updateMany({
		where: { userId, readAt: null },
		data: { readAt: new Date() },
	});
	return { ok: true };
}

/**
 * The words of a notification: a message id with its values (turned into text in each reader's
 * language), or fixed English text for the kinds that are not translated (admin ones).
 */
export type NotificationContent =
	| {
			message: { id: NotificationMessageId; values: NotificationValues };
	  }
	| { title: string; body: string };

export type NotificationMessage = {
	id: NotificationMessageId;
	values: NotificationValues;
};

export type DispatchNotificationInput = NotificationContent & {
	kind: NotificationKind;
	recipientUserIds: string[];
	href?: string;
	excludeUserIds?: string[];
	sittingSlug?: string;
	adminNtfy?: boolean;
};

/** The English text saved with every row, and the parameters when there are any. */
export function contentToStored(content: NotificationContent): {
	title: string;
	body: string;
	params?: { id: NotificationMessageId; values: NotificationValues };
} {
	if ("message" in content) {
		const english = notificationText(
			content.message.id,
			content.message.values,
			"en",
		);
		return { ...english, params: content.message };
	}
	return { title: content.title, body: content.body };
}

/** The absolute address a push opens, in the recipient's language (`/az/...`; English has no prefix). */
function pushHref(href: string, locale: Locale): string {
	if (href.startsWith("http")) {
		return href;
	}
	const path = href.startsWith("/") ? href : `/${href}`;
	return `${resolvePublicAppOrigin()}${withLocalePrefix(path, locale)}`;
}

export async function dispatchNotification(
	db: Database,
	input: DispatchNotificationInput,
): Promise<void> {
	const exclude = new Set(input.excludeUserIds ?? []);
	const recipientIds = [...new Set(input.recipientUserIds)].filter(
		(id) => !exclude.has(id),
	);

	if (recipientIds.length === 0 && !input.adminNtfy && !input.sittingSlug) {
		return;
	}

	for (const userId of recipientIds) {
		await ensureNotificationPreferences(userId, db);
	}

	const prefs = await db.notificationPreference.findMany({
		where: {
			userId: { in: recipientIds },
			kind: kindToDb(input.kind),
		},
	});

	const prefByUser = new Map(prefs.map((p) => [p.userId, p]));
	const href = input.href
		? input.href.startsWith("http")
			? input.href
			: `${resolvePublicAppOrigin()}${input.href.startsWith("/") ? input.href : `/${input.href}`}`
		: undefined;

	const stored = contentToStored(input);
	const inAppRows = recipientIds
		.filter((userId) => prefByUser.get(userId)?.inAppEnabled !== false)
		.map((userId) => ({
			userId,
			kind: kindToDb(input.kind),
			title: stored.title,
			body: stored.body,
			params: stored.params,
			href: input.href ?? null,
		}));

	if (inAppRows.length > 0) {
		await db.notification.createMany({ data: inAppRows });
	}

	const ntfy = resolveNtfyConfig();
	if (!ntfy) {
		return;
	}

	// A personal push is written in the recipient's saved language, and its link opens that
	// language's page. Shared topics (a sitting's, the admins') have mixed readers: English.
	const pushUserIds = recipientIds.filter(
		(userId) => prefByUser.get(userId)?.pushEnabled,
	);
	const localeByUser = new Map(
		(pushUserIds.length > 0
			? await db.user.findMany({
					where: { id: { in: pushUserIds } },
					select: { id: true, locale: true },
				})
			: []
		).map((user) => [user.id, recipientLocale(user)]),
	);
	for (const userId of pushUserIds) {
		const locale = localeByUser.get(userId) ?? "en";
		const text =
			"message" in input
				? notificationText(input.message.id, input.message.values, locale)
				: { title: stored.title, body: stored.body };
		await publishNtfy({
			topic: ntfyUserTopic(ntfy.topicPrefix, userId),
			title: text.title,
			message: text.body,
			click: input.href ? pushHref(input.href, locale) : undefined,
		});
	}

	if (input.sittingSlug) {
		const anyPush = recipientIds.some((id) => prefByUser.get(id)?.pushEnabled);
		if (anyPush) {
			await publishNtfy({
				topic: ntfySittingTopic(ntfy.topicPrefix, input.sittingSlug),
				title: stored.title,
				message: stored.body,
				click: href,
			});
		}
	}

	if (input.adminNtfy) {
		await publishNtfy({
			topic: ntfyAdminTopic(ntfy.topicPrefix),
			title: stored.title,
			message: stored.body,
			click: href,
		});
	}
}

export async function listActiveMemberUserIds(db: Database): Promise<string[]> {
	const users = await db.user.findMany({
		where: { status: { in: ["active", "warned"] } },
		select: { id: true },
	});
	return users.map((u) => u.id);
}

export async function listAdminUserIds(db: Database): Promise<string[]> {
	const users = await db.user.findMany({
		where: { isAdmin: true },
		select: { id: true },
	});
	return users.map((u) => u.id);
}

export async function listSittingParticipantUserIds(
	sittingId: string,
	db: Database,
): Promise<string[]> {
	const rows = await db.participation.findMany({
		where: { sittingId },
		select: { userId: true },
	});
	return rows.map((r) => r.userId);
}
