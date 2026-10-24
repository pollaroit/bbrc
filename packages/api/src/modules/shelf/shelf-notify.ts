import type { Database } from "@bbrc/db";
import { dispatchNotification } from "../notification/notification.service";

export function shelfPath(ownerUsername: string, shelfSlug: string): string {
	return `/users/${ownerUsername}/shelves/${shelfSlug}`;
}

export function displayName(user: { name: string | null; username: string }) {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.username;
}

function clip(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Tell members something changed about a shelf they own or help edit. Never throws. */
export async function notifyShelfCollaboration(
	db: Database,
	input: {
		recipientUserIds: string[];
		excludeUserIds?: string[];
		title: string;
		body: string;
		href?: string;
		kind?: "shelf_collaboration" | "shelf_invitation";
	},
): Promise<void> {
	try {
		await dispatchNotification(db, {
			kind: input.kind ?? "shelf_collaboration",
			recipientUserIds: input.recipientUserIds,
			excludeUserIds: input.excludeUserIds,
			title: clip(input.title, 120),
			body: clip(input.body, 500),
			href: input.href,
		});
	} catch (error) {
		console.error("shelf collaboration notification failed", error);
	}
}
