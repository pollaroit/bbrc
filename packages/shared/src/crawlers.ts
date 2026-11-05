/** Tokens matched case-insensitively against a request User-Agent. */
export const ALLOWED_CRAWLER_UA_TOKENS = [
	"googlebot",
	"google-inspectiontool",
	"storebot-google",
	"adsbot-google",
	"googleother",
	"bingbot",
	"bingpreview",
	"msnbot",
	"adidxbot",
	"twitterbot",
	"facebookexternalhit",
	"facebot",
	"facebookbot",
	"whatsapp",
	"telegrambot",
	"telegram",
	"discordbot",
	"redditbot",
	"gptbot",
	"chatgpt-user",
	"oai-searchbot",
	"google-extended",
	"claudebot",
	"claude-user",
	"claude-searchbot",
	"anthropic-ai",
	"grok",
	"instagram",
	"tumblr",
	"linkedinbot",
	"pinterestbot",
	"pinterest",
	"snapchat",
	"tiktokspider",
	"tiktok",
] as const;

/** `User-agent` lines for robots.txt. Named crawlers may fetch; everyone else may not. */
export const ROBOTS_ALLOWED_USER_AGENTS = [
	"Googlebot",
	"Googlebot-Image",
	"Googlebot-Video",
	"Google-InspectionTool",
	"Storebot-Google",
	"AdsBot-Google",
	"Bingbot",
	"BingPreview",
	"Twitterbot",
	"facebookexternalhit",
	"Facebot",
	"WhatsApp",
	"TelegramBot",
	"Discordbot",
	"Redditbot",
	"GPTBot",
	"ChatGPT-User",
	"OAI-SearchBot",
	"Google-Extended",
	"ClaudeBot",
	"Claude-User",
	"Claude-SearchBot",
	"Grok",
	"Instagram",
	"Tumblr",
	"LinkedInBot",
	"Pinterest",
	"Pinterestbot",
	"Snapchat",
	"TikTokSpider",
	"TikTok",
] as const;

const INFRA_UA_TOKENS = ["vercel", "qstash", "upstash"] as const;

const BLOCKED_SCRAPER_UA_TOKENS = [
	"bot",
	"crawl",
	"spider",
	"slurp",
	"scrape",
	"curl",
	"wget",
	"httpie",
	"python",
	"axios",
	"node-fetch",
	"undici",
	"go-http",
	"okhttp",
	"headless",
	"phantom",
	"puppeteer",
	"playwright",
	"selenium",
	"lighthouse",
	"ahrefs",
	"semrush",
	"mj12",
	"bytespider",
	"perplexity",
	"dotbot",
	"petalbot",
	"yandexbot",
	"baiduspider",
	"sogou",
	"duckduckbot",
] as const;

const CRAWLER_UA_PATTERN = new RegExp(
	ALLOWED_CRAWLER_UA_TOKENS.map((token) =>
		token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	).join("|"),
	"i",
);

const INFRA_UA_PATTERN = new RegExp(INFRA_UA_TOKENS.join("|"), "i");

const BLOCKED_SCRAPER_UA_PATTERN = new RegExp(
	BLOCKED_SCRAPER_UA_TOKENS.map((token) =>
		token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	).join("|"),
	"i",
);

export function isBrowserUserAgent(userAgent: string): boolean {
	return /mozilla/i.test(userAgent);
}

export function isAllowedCrawlerUserAgent(userAgent: string): boolean {
	return CRAWLER_UA_PATTERN.test(userAgent);
}

export function isInfraUserAgent(userAgent: string): boolean {
	return INFRA_UA_PATTERN.test(userAgent);
}

export function isBlockedScraperUserAgent(userAgent: string): boolean {
	return BLOCKED_SCRAPER_UA_PATTERN.test(userAgent);
}

/** Empty, tiny, or unknown tool UAs are refused. Named crawlers win over generic "bot" tokens. */
export function mayFetchSite(userAgent: string | null): boolean {
	const ua = userAgent?.trim() ?? "";
	if (ua.length < 8) return false;
	if (isAllowedCrawlerUserAgent(ua) || isInfraUserAgent(ua)) return true;
	if (isBlockedScraperUserAgent(ua)) return false;
	return isBrowserUserAgent(ua);
}

/**
 * Countries whose visitors may use the site. The club is in Azerbaijan; anyone
 * else is only let in when they are a named crawler or our own infrastructure
 * (link previews, search engines, QStash), because those fetch from anywhere.
 * Add a code here (ISO 3166-1 alpha-2) when a member lives or travels abroad.
 */
export const ALLOWED_VISITOR_COUNTRIES = ["AZ"] as const;

/**
 * `country` is Vercel's `x-vercel-ip-country` header. It is missing locally and
 * on unknown addresses, and then the visitor is let through: this is a cost
 * filter, not a security boundary (a scraper can fake a user agent, so the
 * firewall in the Vercel dashboard is the real wall).
 */
export function mayVisitFromCountry(
	userAgent: string | null,
	country: string | null,
): boolean {
	const code = country?.trim().toUpperCase();
	if (!code || code === "XX") return true;
	if ((ALLOWED_VISITOR_COUNTRIES as readonly string[]).includes(code)) {
		return true;
	}
	const ua = userAgent?.trim() ?? "";
	return isAllowedCrawlerUserAgent(ua) || isInfraUserAgent(ua);
}
