import { notifyChannel } from "@bbrc/shared";
import { getAblyRest } from "../realtime/ably";
import { realtimeClientId } from "../realtime/client-id";

/*
 * Getting a notification to a member's screens, through Ably.
 *
 * - **Live in the app** (Pub/Sub): a message on the member's private channel
 *   (`notify:<opaque id>`) that the open app shows at once.
 * - **Push** (Ably Push): a message addressed to the member's opaque id, which
 *   Ably delivers to every device they have turned push on for.
 *
 * Both are best effort and never throw: a notification must never break the
 * action that caused it. They do nothing until `ABLY_API_KEY` is set.
 */

/** Ably accepts up to 100 channels per batch publish. */
const CHANNELS_PER_BATCH = 100;
/** And up to 10,000 notifications per batch push; stay well under it. */
const PUSHES_PER_BATCH = 1000;

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		out.push(items.slice(index, index + size));
	}
	return out;
}

export type LiveMessage = {
	userId: string;
	/** `notification` (a new one, with the new unread count) or `unread` (the count changed). */
	name: "notification" | "unread";
	data: unknown;
};

/** Publishes each message on its member's private channel. */
export async function publishLive(messages: LiveMessage[]): Promise<void> {
	const rest = getAblyRest();
	if (!rest || messages.length === 0) return;

	const specs = messages.flatMap((message) => {
		const clientId = realtimeClientId(message.userId);
		return clientId
			? [
					{
						channels: [notifyChannel(clientId)],
						messages: [{ name: message.name, data: message.data }],
					},
				]
			: [];
	});

	for (const group of chunk(specs, CHANNELS_PER_BATCH)) {
		try {
			await rest.batchPublish(group);
		} catch (error) {
			console.warn("Live notification publish failed:", error);
		}
	}
}

export type PushMessage = {
	userId: string;
	payload: unknown;
};

/** Sends each member a push, to all their devices. A member with no device simply gets nothing. */
export async function pushToMembers(messages: PushMessage[]): Promise<void> {
	const rest = getAblyRest();
	if (!rest || messages.length === 0) return;

	const items = messages.flatMap((message) => {
		const clientId = realtimeClientId(message.userId);
		return clientId
			? [{ recipient: { clientId }, payload: message.payload }]
			: [];
	});

	for (const group of chunk(items, PUSHES_PER_BATCH)) {
		try {
			const response = await rest.request(
				"post",
				"/push/batch/publish",
				2,
				{},
				group,
			);
			if (!response.success) {
				console.warn(
					`Push batch was refused (${response.statusCode}): ${response.errorMessage}`,
				);
			}
		} catch (error) {
			console.warn("Push batch failed:", error);
		}
	}
}
