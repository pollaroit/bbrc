import type { Database } from "@bbrc/db";
import {
	dispatchNotification,
	type NotificationMessage,
} from "../notification/notification.service";

export function shelfPath(ownerUsername: string, shelfSlug: string): string {
	return `/users/${ownerUsername}/shelves/${shelfSlug}`;
}

export function displayName(user: { name: string | null; username: string }) {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.username;
}

/** Tell members something changed about a shelf they own or help edit. Never throws. */
export async function notifyShelfCollaboration(
	db: Database,
	input: {
		recipientUserIds: string[];
		excludeUserIds?: string[];
		message: NotificationMessage;
		href?: string;
		kind?: "shelf_collaboration" | "shelf_invitation";
	},
): Promise<void> {
	try {
		await dispatchNotification(db, {
			kind: input.kind ?? "shelf_collaboration",
			recipientUserIds: input.recipientUserIds,
			excludeUserIds: input.excludeUserIds,
			message: input.message,
			href: input.href,
		});
	} catch (error) {
		console.error("shelf collaboration notification failed", error);
	}
}
