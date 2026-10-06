export const postFeedSortValues = ["hot", "top", "recent"] as const;
export type PostFeedSort = (typeof postFeedSortValues)[number];

export const postFeedRangeValues = [
	"all",
	"year",
	"month",
	"week",
	"day",
] as const;
export type PostFeedRange = (typeof postFeedRangeValues)[number];

/** Engagement weights for Top / Hot (shares = quoted-in-post attachments). */
export const POST_FEED_LIKE_WEIGHT = 1;
export const POST_FEED_COMMENT_WEIGHT = 2;
export const POST_FEED_SHARE_WEIGHT = 3;

const MS_PER_DAY = 86_400_000;

export function postFeedRangeMin(
	range: PostFeedRange,
	now: Date = new Date(),
): Date | undefined {
	switch (range) {
		case "all":
			return undefined;
		case "year":
			return new Date(now.getTime() - 365 * MS_PER_DAY);
		case "month":
			return new Date(now.getTime() - 30 * MS_PER_DAY);
		case "week":
			return new Date(now.getTime() - 7 * MS_PER_DAY);
		case "day":
			return new Date(now.getTime() - MS_PER_DAY);
		default: {
			const _exhaustive: never = range;
			return _exhaustive;
		}
	}
}

export function computePostEngagementScore(
	likeCount: number,
	commentCount: number,
	shareCount: number,
): number {
	return (
		likeCount * POST_FEED_LIKE_WEIGHT +
		commentCount * POST_FEED_COMMENT_WEIGHT +
		shareCount * POST_FEED_SHARE_WEIGHT
	);
}

/** Reddit-style hot ranking: log engagement plus recency boost. */
export function computePostHotScore(
	engagement: number,
	createdAt: Date,
): number {
	const order = Math.log10(Math.max(engagement, 1));
	const epochSeconds = createdAt.getTime() / 1000;
	return order + epochSeconds / 45_000;
}

export type PostFeedCursor =
	| { kind: "recent"; createdAt: string; slug: string }
	| { kind: "top"; score: number; slug: string }
	| { kind: "hot"; score: number; slug: string };

export function encodePostFeedCursor(cursor: PostFeedCursor): string {
	return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodePostFeedCursor(raw: string): PostFeedCursor | null {
	try {
		const parsed = JSON.parse(
			Buffer.from(raw, "base64url").toString("utf8"),
		) as PostFeedCursor;
		if (!parsed || typeof parsed !== "object" || !("kind" in parsed)) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}
