import { describe, expect, it } from "bun:test";
import { mayFetchSite, mayVisitFromCountry } from "./crawlers";

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

describe("mayVisitFromCountry", () => {
	const browser = "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0";

	it("lets Azerbaijan and unknown countries in", () => {
		expect(mayVisitFromCountry(browser, "AZ")).toBe(true);
		expect(mayVisitFromCountry(browser, "az")).toBe(true);
		expect(mayVisitFromCountry(browser, null)).toBe(true);
		expect(mayVisitFromCountry(browser, "XX")).toBe(true);
	});

	it("turns browsers from elsewhere away but keeps named crawlers and infra", () => {
		expect(mayVisitFromCountry(browser, "US")).toBe(false);
		expect(mayVisitFromCountry(browser, "SG")).toBe(false);
		expect(mayVisitFromCountry("Googlebot/2.1", "US")).toBe(true);
		expect(mayVisitFromCountry("QStash-Server/1.0", "US")).toBe(true);
	});
});
