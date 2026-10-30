import type { Database, Prisma } from "@bbrc/db";
import {
	buildPushPayload,
	defaultPushEnabledForKind,
	effectiveVisibility,
	isOffByDefaultKind,
	NOTIFICATION_KIND_GROUPS,
	NOTIFICATION_KIND_LABELS,
	NOTIFICATION_KINDS,
	type NotificationKind,
	type Visibility,
} from "@bbrc/shared";
import type { NotificationKind as DbNotificationKind } from "../../../../db/prisma/generated/enums";
import { resolvePublicAppOrigin } from "../../lib/public-origin";
import { publishLive, pushToMembers } from "../../lib/push/delivery";
import { loadBlockedIds, loadFriendIds } from "../visibility/viewer";
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

export async function getNotificationPreferences(
	userId: string,
	isAdmin: boolean,
	db: Database,
): Promise<GetNotificationPreferencesOutput> {
	await ensureNotificationPreferences(userId, db);

	const rows = await db.notificationPreference.findMany({
		where: { userId },
		orderBy: { kind: "asc" },
	});

	const preferences = rows
		.filter((row) => isAdmin || !isAdminOnlyKind(row.kind as NotificationKind))
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

	return { preferences };
}

function isAdminOnlyKind(kind: NotificationKind): boolean {
	return (NOTIFICATION_KIND_GROUPS.admin as readonly string[]).includes(kind);
}

export async function updateNotificationPreferences(
	userId: string,
	isAdmin: boolean,
	input: UpdateNotificationPreferencesInput,
	db: Database,
): Promise<{ ok: true }> {
	await ensureNotificationPreferences(userId, db);

	for (const pref of input.preferences) {
		if (!isAdmin && isAdminOnlyKind(pref.kind)) {
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

/** Tells the member's other open screens the new unread count, so the bell agrees everywhere. */
async function publishUnreadCount(userId: string, db: Database) {
	const { count } = await getUnreadNotificationCount(userId, db);
	await publishLive([{ userId, name: "unread", data: { count } }]);
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
	await publishUnreadCount(userId, db);
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
	await publishUnreadCount(userId, db);
	return { ok: true };
}

export type DispatchNotificationInput = {
	kind: NotificationKind;
	recipientUserIds: string[];
	title: string;
	body: string;
	href?: string;
	excludeUserIds?: string[];
};

/**
 * Tells each recipient, the way they asked to be told:
 * - **Bell** (`inAppEnabled`): a row in their notifications, shown live in any
 *   open screen of theirs (with the new unread count);
 * - **Push** (`pushEnabled`): a push to every device they have turned push on
 *   for, whether or not the bell is on.
 *
 * Nothing here ever throws on delivery trouble: the action that caused the
 * notification must not fail because a phone could not be reached.
 */
export async function dispatchNotification(
	db: Database,
	input: DispatchNotificationInput,
): Promise<void> {
	const exclude = new Set(input.excludeUserIds ?? []);
	const recipientIds = [...new Set(input.recipientUserIds)].filter(
		(id) => !exclude.has(id),
	);
	if (recipientIds.length === 0) {
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

	const bellRecipients = recipientIds.filter(
		(userId) => prefByUser.get(userId)?.inAppEnabled !== false,
	);
	const created =
		bellRecipients.length > 0
			? await db.notification.createManyAndReturn({
					data: bellRecipients.map((userId) => ({
						userId,
						kind: kindToDb(input.kind),
						title: input.title,
						body: input.body,
						href: input.href ?? null,
					})),
					select: { id: true, userId: true, createdAt: true },
				})
			: [];
	const idByUser = new Map(created.map((row) => [row.userId, row]));

	// Live: the new notification and the new unread count, in one message each.
	if (created.length > 0) {
		const counts = await db.notification.groupBy({
			by: ["userId"],
			where: { userId: { in: created.map((row) => row.userId) }, readAt: null },
			_count: { _all: true },
		});
		const unread = new Map(counts.map((row) => [row.userId, row._count._all]));
		await publishLive(
			created.map((row) => ({
				userId: row.userId,
				name: "notification" as const,
				data: {
					notification: {
						id: row.id,
						kind: input.kind,
						title: input.title,
						body: input.body,
						href: input.href ?? null,
						createdAt: row.createdAt.toISOString(),
					},
					unreadCount: unread.get(row.userId) ?? 1,
				},
			})),
		);
	}

	// Push: to every device of each member who switched it on for this kind.
	const origin = resolvePublicAppOrigin();
	const pushRecipients = recipientIds.filter(
		(userId) => prefByUser.get(userId)?.pushEnabled === true,
	);
	if (pushRecipients.length > 0) {
		await pushToMembers(
			pushRecipients.map((userId) => ({
				userId,
				payload: buildPushPayload(
					{
						// One id per notification, so a repeat replaces the earlier one on the device.
						notificationId: idByUser.get(userId)?.id ?? crypto.randomUUID(),
						kind: input.kind,
						title: input.title,
						body: input.body,
						href: input.href,
					},
					origin,
				),
			})),
		);
	}
}

export async function listActiveMemberUserIds(db: Database): Promise<string[]> {
	const users = await db.user.findMany({
		where: { status: { in: ["active", "warned"] } },
		select: { id: true },
	});
	return users.map((u) => u.id);
}

/**
 * Active members who may see what `authorId` publishes: a post (their profile level) or
 * a review (also their reviews setting). Public: everyone except blocked pairs. Friends
 * only: their friends. Private: nobody but admins. Admins always count. The author is
 * included when they are active; callers exclude them.
 */
export async function listAudienceUserIds(
	db: Database,
	authorId: string,
	options: { section?: "reviews"; item?: Visibility } = {},
): Promise<string[]> {
	const author = await db.user.findUnique({
		where: { id: authorId },
		select: { profileVisibility: true, reviewsVisibility: true },
	});
	if (!author) return [];
	const level = effectiveVisibility({
		profile: author.profileVisibility,
		section: options.section === "reviews" ? author.reviewsVisibility : null,
		item: options.item ?? null,
	});
	const active = {
		status: { in: ["active", "warned"] },
	} satisfies Prisma.UserWhereInput;
	const admins = await db.user.findMany({
		where: { ...active, isAdmin: true },
		select: { id: true },
	});
	const adminIds = admins.map((user) => user.id);
	if (level === "private") return adminIds;
	if (level === "friends") {
		const friendIds = await loadFriendIds(db, authorId);
		const friends = await db.user.findMany({
			where: { ...active, id: { in: friendIds } },
			select: { id: true },
		});
		return [...new Set([...friends.map((user) => user.id), ...adminIds])];
	}
	const blockedIds = await loadBlockedIds(db, authorId);
	const members = await db.user.findMany({
		where: { ...active, id: { notIn: blockedIds } },
		select: { id: true },
	});
	return [...new Set([...members.map((user) => user.id), ...adminIds])];
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
