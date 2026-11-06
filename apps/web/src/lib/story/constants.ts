export const BOOK_STORY_WIDTH = 1080;
export const BOOK_STORY_HEIGHT = 1920;

export function bookStoryPath(bookSlug: string): `/story/book/${string}` {
	return `/story/book/${bookSlug}`;
}

/** A finished Reading Mode session as a picture: tall for stories and chats, 4:5 for a post. */
export const SESSION_STORY_SHAPES = {
	story: { width: 1080, height: 1920 },
	post: { width: 1080, height: 1350 },
} as const;
export type SessionStoryShape = keyof typeof SESSION_STORY_SHAPES;

export function sessionStoryPath(
	sessionId: string,
	shape: SessionStoryShape = "story",
): `/story/session/${string}` {
	return `/story/session/${sessionId}?shape=${shape}` as `/story/session/${string}`;
}

/** A member's stats as a picture: the same two shapes as the session picture. */
export type StatsStoryShape = SessionStoryShape;

export function statsStoryPath(
	username: string,
	shape: StatsStoryShape,
	period: URLSearchParams | string = "",
): `/story/stats/${string}` {
	const query = new URLSearchParams(
		typeof period === "string" ? period : period.toString(),
	);
	query.set("shape", shape);
	return `/story/stats/${username}?${query.toString()}` as `/story/stats/${string}`;
}
