import type { Database } from "@bbrc/db";
import {
	defaultPushEnabledForKind,
	isOffByDefaultKind,
	NOTIFICATION_KIND_GROUPS,
	NOTIFICATION_KIND_LABELS,
	NOTIFICATION_KINDS,
	type NotificationKind,
} from "@bbrc/shared";
import type { NotificationKind as DbNotificationKind } from "../../../../db/prisma/generated/enums";
import {
	ntfyAdminTopic,
	ntfySittingTopic,
	ntfyUserTopic,
	publishNtfy,
	resolveNtfyConfig,
} from "../../lib/ntfy";
import type {
	GetNotificationListInput,
	GetNotificationListOutput,
	GetNotificationPreferencesOutput,
	UpdateNotificationPreferencesInput,
} from "./notification.schema";

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
				label: NOTIFICATION_KIND_LABELS[kind],
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
			readAt: true,
			createdAt: true,
		},
	});

	const hasMore = rows.length > input.limit;
	const items = hasMore ? rows.slice(0, input.limit) : rows;

	return {
		items: items.map((row) => ({
			id: row.id,
			kind: row.kind as NotificationKind,
			title: row.title,
			body: row.body,
			href: row.href,
			readAt: row.readAt,
			createdAt: row.createdAt,
		})),
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

export type DispatchNotificationInput = {
	kind: NotificationKind;
	recipientUserIds: string[];
	title: string;
	body: string;
	href?: string;
	excludeUserIds?: string[];
	sittingSlug?: string;
	adminNtfy?: boolean;
};

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

	const inAppRows = recipientIds
		.filter((userId) => prefByUser.get(userId)?.inAppEnabled !== false)
		.map((userId) => ({
			userId,
			kind: kindToDb(input.kind),
			title: input.title,
			body: input.body,
			href: input.href ?? null,
		}));

	if (inAppRows.length > 0) {
		await db.notification.createMany({ data: inAppRows });
	}

	const ntfy = resolveNtfyConfig();
	if (!ntfy) {
		return;
	}

	for (const userId of recipientIds) {
		if (!prefByUser.get(userId)?.pushEnabled) {
			continue;
		}
		await publishNtfy({
			topic: ntfyUserTopic(ntfy.topicPrefix, userId),
			title: input.title,
			message: input.body,
			click: href,
		});
	}

	if (input.sittingSlug) {
		const anyPush = recipientIds.some((id) => prefByUser.get(id)?.pushEnabled);
		if (anyPush) {
			await publishNtfy({
				topic: ntfySittingTopic(ntfy.topicPrefix, input.sittingSlug),
				title: input.title,
				message: input.body,
				click: href,
			});
		}
	}

	if (input.adminNtfy) {
		await publishNtfy({
			topic: ntfyAdminTopic(ntfy.topicPrefix),
			title: input.title,
			message: input.body,
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
