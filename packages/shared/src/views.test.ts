import { describe, expect, test } from "bun:test";
import {
	clubDayKey,
	clubWeekdayHour,
	dayKeysBetween,
	isBotUserAgent,
	milestonesCrossed,
	parseUserAgent,
	viewSourceFrom,
} from "./views";

const CHROME =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("bots", () => {
	test("real browsers are not bots", () => {
		expect(isBotUserAgent(CHROME)).toBe(false);
		expect(isBotUserAgent(IPHONE)).toBe(false);
	});
	test("crawlers, previews and scripts are", () => {
		expect(
			isBotUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)"),
		).toBe(true);
		expect(isBotUserAgent("WhatsApp/2.23.20.0")).toBe(true);
		expect(isBotUserAgent("TelegramBot (like TwitterBot)")).toBe(true);
		expect(isBotUserAgent("curl/8.4.0 test agent")).toBe(true);
		expect(
			isBotUserAgent("Mozilla/5.0 HeadlessChrome/126.0.0.0 Safari/537.36"),
		).toBe(true);
	});
	test("a missing or tiny user agent is a bot", () => {
		expect(isBotUserAgent(null)).toBe(true);
		expect(isBotUserAgent("")).toBe(true);
		expect(isBotUserAgent("x")).toBe(true);
	});
});

describe("user agents", () => {
	test("desktop", () => {
		expect(parseUserAgent(CHROME)).toEqual({
			device: "desktop",
			browser: "Chrome",
			os: "Windows",
		});
	});
	test("phone", () => {
		expect(parseUserAgent(IPHONE)).toEqual({
			device: "mobile",
			browser: "Safari",
			os: "iOS",
		});
	});
	test("android tablet is not a phone", () => {
		expect(
			parseUserAgent(
				"Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/126 Safari/537.36",
			).device,
		).toBe("tablet");
	});
});

describe("sources", () => {
	test("in-app navigation", () => {
		expect(viewSourceFrom({ previousPath: "/", referrerHost: null })).toBe(
			"feed",
		);
		expect(
			viewSourceFrom({ previousPath: "/users/ann", referrerHost: null }),
		).toBe("profile");
		expect(
			viewSourceFrom({ previousPath: "/shelves?tab=all", referrerHost: null }),
		).toBe("shelves");
		expect(
			viewSourceFrom({
				previousPath: "/books/dune/reviews",
				referrerHost: null,
			}),
		).toBe("book_reviews");
		expect(
			viewSourceFrom({
				previousPath: "/sittings/x/reviews",
				referrerHost: null,
			}),
		).toBe("sitting_reviews");
		expect(viewSourceFrom({ previousPath: "/books", referrerHost: null })).toBe(
			"books",
		);
	});
	test("first load", () => {
		expect(viewSourceFrom({ previousPath: null, referrerHost: "t.me" })).toBe(
			"external",
		);
		expect(viewSourceFrom({ previousPath: null, referrerHost: null })).toBe(
			"direct",
		);
	});
});

describe("milestones", () => {
	test("only the ones passed", () => {
		expect(milestonesCrossed(99, 100)).toEqual([100]);
		expect(milestonesCrossed(100, 101)).toEqual([]);
		expect(milestonesCrossed(90, 600)).toEqual([100, 500]);
	});
});

describe("club days", () => {
	test("the day follows the club clock", () => {
		const date = new Date("2026-10-25T22:30:00Z");
		expect(clubDayKey(date, "Asia/Baku")).toBe("2026-10-26");
		expect(clubDayKey(date, "UTC")).toBe("2026-10-25");
	});
	test("monday is zero", () => {
		expect(clubWeekdayHour(new Date("2026-10-26T08:00:00Z"), "UTC")).toEqual({
			weekday: 0,
			hour: 8,
		});
		expect(
			clubWeekdayHour(new Date("2026-10-25T08:00:00Z"), "UTC").weekday,
		).toBe(6);
	});
	test("day keys are inclusive", () => {
		expect(dayKeysBetween("2026-10-30", "2026-11-02")).toEqual([
			"2026-10-30",
			"2026-10-31",
			"2026-11-01",
			"2026-11-02",
		]);
	});
});
