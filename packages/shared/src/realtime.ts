import { isSlug } from "./slug";

/*
 * Realtime (Ably): channel names and what a member may do on them. Pure, so the
 * server, the browser and the tests all agree. Add a new channel here first.
 *
 * - `reading:<book>`   who is in Reading Mode on a book (presence). Every
 *                      signed-in member may watch; only a member with an open
 *                      Reading Mode session for that book may enter.
 * - `dev:*`            for the /dev/realtime page, in development only.
 *
 * A member can never publish to the reading channels: presence is the only thing
 * that happens there.
 */

/** How long a token lasts. The browser asks for a new one before it runs out. */
export const REALTIME_TOKEN_TTL_MS = 60 * 60 * 1000;

/** The connection closes this long after the tab was hidden (unless a session is running). */
export const REALTIME_IDLE_CLOSE_MS = 2 * 60 * 1000;

export const READING_CHANNEL_PREFIX = "reading:";
export const DEV_CHANNEL_PREFIX = "dev:";

export function readingChannel(bookSlug: string): string {
	return `${READING_CHANNEL_PREFIX}${bookSlug}`;
}

/** The book a reading channel belongs to, or null for any other name. */
export function bookSlugOfReadingChannel(channel: string): string | null {
	if (!channel.startsWith(READING_CHANNEL_PREFIX)) return null;
	const slug = channel.slice(READING_CHANNEL_PREFIX.length);
	return isSlug(slug) ? slug : null;
}

/** Ably capability: channel (or pattern) to the operations allowed on it. */
export type RealtimeCapability = Record<string, string[]>;

/**
 * What a signed-in member may do.
 *
 * `presenceBookSlug` is the book of their open Reading Mode session, read from
 * the database when the token is issued (and again when it is renewed), so a
 * member can only appear as "reading" where they really are.
 */
export function buildMemberCapability(input: {
	presenceBookSlug?: string | null;
	dev?: boolean;
}): RealtimeCapability {
	const capability: RealtimeCapability = {
		[`${READING_CHANNEL_PREFIX}*`]: ["subscribe"],
	};

	const slug = input.presenceBookSlug;
	if (slug && isSlug(slug)) {
		capability[readingChannel(slug)] = ["subscribe", "presence"];
	}

	if (input.dev) {
		capability[`${DEV_CHANNEL_PREFIX}*`] = ["subscribe", "publish", "presence"];
	}
	return capability;
}

/** The distinct member ids currently present, from a presence list. */
export function uniquePresentIds(members: { clientId: string }[]): string[] {
	return [...new Set(members.map((member) => member.clientId))].sort();
}
