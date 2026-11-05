import { describe, expect, it } from "bun:test";
import { mayFetchSite } from "./crawlers";

describe("mayFetchSite", () => {
	it("allows browsers and the named crawlers", () => {
		expect(
			mayFetchSite(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
			),
		).toBe(true);
		expect(mayFetchSite("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
		expect(mayFetchSite("Twitterbot/1.0")).toBe(true);
		expect(mayFetchSite("facebookexternalhit/1.1")).toBe(true);
		expect(mayFetchSite("WhatsApp/2.0")).toBe(true);
		expect(mayFetchSite("TelegramBot (like TwitterBot)")).toBe(true);
		expect(mayFetchSite("Mozilla/5.0 (compatible; Discordbot/2.0)")).toBe(true);
		expect(mayFetchSite("Redditbot/1.0")).toBe(true);
		expect(
			mayFetchSite("Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot)"),
		).toBe(true);
		expect(mayFetchSite("ClaudeBot/1.0")).toBe(true);
		expect(mayFetchSite("LinkedInBot/1.0")).toBe(true);
		expect(mayFetchSite("Pinterest/0.2")).toBe(true);
		expect(mayFetchSite("Instagram 192.168.1.5.80 Android")).toBe(true);
		expect(mayFetchSite("TikTokSpider")).toBe(true);
		expect(mayFetchSite("QStash-Server/1.0")).toBe(true);
	});

	it("refuses empty, tiny, and generic scraper agents", () => {
		expect(mayFetchSite(null)).toBe(false);
		expect(mayFetchSite("")).toBe(false);
		expect(mayFetchSite("curl/8.0")).toBe(false);
		expect(mayFetchSite("python-requests/2.32")).toBe(false);
		expect(mayFetchSite("Mozilla/5.0 (compatible; Bytespider)")).toBe(false);
		expect(mayFetchSite("Bytespider")).toBe(false);
		expect(mayFetchSite("Mozilla/5.0 (compatible; AhrefsBot/7.0)")).toBe(false);
	});
});
