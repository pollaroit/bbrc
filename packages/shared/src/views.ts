import { getZonedParts, resolveClubTimeZone } from "./club-timezone";

export const VIEW_RESOURCES = [
	"book",
	"post",
	"shelf",
	"review",
	"user",
] as const;
export type ViewResourceKind = (typeof VIEW_RESOURCES)[number];

export const VIEW_KINDS = ["detail", "list"] as const;
export type ViewKindName = (typeof VIEW_KINDS)[number];

export const VIEW_SOURCES = [
	"feed",
	"profile",
	"shelves",
	"books",
	"people",
	"book_reviews",
	"sitting_reviews",
	"sitting",
	"search",
	"notification",
	"external",
	"direct",
	"other",
] as const;
export type ViewSourceName = (typeof VIEW_SOURCES)[number];

export const VIEW_SOURCE_LABELS: Record<ViewSourceName, string> = {
	feed: "Home feed",
	profile: "A member's profile",
	shelves: "Shelves page",
	books: "Books page",
	people: "People page",
	book_reviews: "Book reviews",
	sitting_reviews: "Sitting reviews",
	sitting: "A sitting",
	search: "Search",
	notification: "Notifications",
	external: "Another website",
	direct: "Typed or bookmarked",
	other: "Elsewhere on BBRC",
};

/** The same viewer counts once per item and kind inside this window. */
export const VIEW_DEDUPE_MS = 30 * 60 * 1000;
/** Raw views are kept this long; older days are summed into daily rows. */
export const VIEW_RETENTION_DAYS = 90;
/** One beacon may carry this many views. */
export const VIEW_BATCH_MAX = 20;
/** One viewer may send this many views per hour before extra ones are ignored. */
export const VIEW_HOURLY_LIMIT = 400;
/** A card must be this visible, for this long, to count as seen in a list. */
export const VIEW_IMPRESSION_RATIO = 0.5;
export const VIEW_IMPRESSION_MS = 1000;

export const VIEW_MILESTONES = [100, 500, 1000, 5000, 10000] as const;

/** Milestones passed when a count grows from `before` to `after`. */
export function milestonesCrossed(before: number, after: number): number[] {
	return VIEW_MILESTONES.filter((mark) => before < mark && after >= mark);
}

export const INSIGHT_RANGES = ["7d", "30d", "90d", "all"] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number];

export function insightRangeDays(range: InsightRange): number | null {
	if (range === "all") return null;
	return Number.parseInt(range, 10);
}

// ── Bots ───────────────────────────────────────────────────────────────────

const BOT_PATTERN = new RegExp(
	[
		"bot",
		"crawl",
		"spider",
		"slurp",
		"scrape",
		"fetch",
		"preview",
		"facebookexternalhit",
		"whatsapp",
		"telegram",
		"discord",
		"slack",
		"twitter",
		"linkedin",
		"pinterest",
		"embedly",
		"curl",
		"wget",
		"httpie",
		"python",
		"axios",
		"node-fetch",
		"undici",
		"go-http",
		"java/",
		"okhttp",
		"libwww",
		"headless",
		"phantom",
		"puppeteer",
		"playwright",
		"selenium",
		"lighthouse",
		"pagespeed",
		"gtmetrix",
		"pingdom",
		"uptime",
		"monitor",
		"ahrefs",
		"semrush",
		"mj12",
		"bytespider",
		"gptbot",
		"anthropic",
		"claude",
		"perplexity",
		"ccbot",
		"petalbot",
		"yandex",
		"baidu",
		"duckduck",
		"vercel",
	].join("|"),
	"i",
);

/** True for crawlers, link previews, monitors, scripts and headless browsers. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
	const value = userAgent?.trim();
	if (!value || value.length < 12) return true;
	return BOT_PATTERN.test(value);
}

// ── User agents ────────────────────────────────────────────────────────────

export type ParsedUserAgent = {
	device: "desktop" | "mobile" | "tablet";
	browser: string;
	os: string;
};

export function parseUserAgent(
	userAgent: string | null | undefined,
): ParsedUserAgent {
	const ua = userAgent ?? "";

	const os = /Windows/i.test(ua)
		? "Windows"
		: /iPhone|iPad|iPod/i.test(ua)
			? "iOS"
			: /Android/i.test(ua)
				? "Android"
				: /Mac OS X|Macintosh/i.test(ua)
					? "macOS"
					: /CrOS/i.test(ua)
						? "ChromeOS"
						: /Linux|X11/i.test(ua)
							? "Linux"
							: "Other";

	const browser = /Edg(e|A|iOS)?\//i.test(ua)
		? "Edge"
		: /OPR\/|Opera/i.test(ua)
			? "Opera"
			: /SamsungBrowser/i.test(ua)
				? "Samsung Internet"
				: /Firefox|FxiOS/i.test(ua)
					? "Firefox"
					: /Chrome|CriOS|Chromium/i.test(ua)
						? "Chrome"
						: /Safari/i.test(ua)
							? "Safari"
							: "Other";

	const device =
		/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
			? "tablet"
			: /Mobi|iPhone|iPod|Android/i.test(ua)
				? "mobile"
				: "desktop";

	return { device, browser, os };
}

// ── Where a view came from ─────────────────────────────────────────────────

/**
 * The place a view came from, from the page the member was on before (inside
 * the app) or the referrer (first load). `previousPath` is a path such as
 * `/users/ann`; `referrerHost` is only set for another website.
 */
export function viewSourceFrom(input: {
	previousPath: string | null;
	referrerHost: string | null;
}): ViewSourceName {
	const path = input.previousPath?.split("?")[0] ?? null;
	if (path) {
		if (path === "/") return "feed";
		if (path.startsWith("/search")) return "search";
		if (path.startsWith("/notifications")) return "notification";
		if (path.startsWith("/shelves")) return "shelves";
		if (path.startsWith("/people") || path === "/users") return "people";
		if (path.startsWith("/books")) {
			return /\/reviews|\/feedbacks/.test(path) ? "book_reviews" : "books";
		}
		if (path.startsWith("/sittings")) {
			return /\/reviews/.test(path) ? "sitting_reviews" : "sitting";
		}
		if (path.startsWith("/users/")) return "profile";
		return "other";
	}
	return input.referrerHost ? "external" : "direct";
}

// ── Club days ──────────────────────────────────────────────────────────────

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD` of the club-local day. */
export function clubDayKey(date: Date, timeZone = resolveClubTimeZone()) {
	const parts = getZonedParts(date, timeZone);
	return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const VIEW_WEEKDAY_LABELS = WEEKDAYS;

/** Weekday (Monday = 0) and hour of the club-local clock. */
export function clubWeekdayHour(
	date: Date,
	timeZone = resolveClubTimeZone(),
): { weekday: number; hour: number } {
	const parts = getZonedParts(date, timeZone);
	const weekday = new Date(
		Date.UTC(parts.year, parts.month - 1, parts.day),
	).getUTCDay();
	return { weekday: (weekday + 6) % 7, hour: parts.hour };
}

/** Every `YYYY-MM-DD` from `from` to `to`, inclusive. */
export function dayKeysBetween(from: string, to: string): string[] {
	const keys: string[] = [];
	const cursor = new Date(`${from}T00:00:00Z`);
	const end = new Date(`${to}T00:00:00Z`);
	while (cursor.getTime() <= end.getTime() && keys.length < 4000) {
		keys.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return keys;
}

/** A visitor id that is only a hash of what the request showed, for when cookies are off. */
export function isHashedVisitorId(visitorId: string): boolean {
	return visitorId.startsWith("h:");
}
