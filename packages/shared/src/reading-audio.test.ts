import { describe, expect, test } from "bun:test";
import {
	clampAudioPosition,
	editionFormatFromText,
	formatAudioTime,
	percentFromSeconds,
	secondsFromHoursMinutes,
	splitSeconds,
} from "./reading-audio";

describe("reading audio", () => {
	test("hours and minutes make seconds and back", () => {
		expect(secondsFromHoursMinutes(3, 20)).toBe(12000);
		expect(splitSeconds(12000)).toEqual({ hours: 3, minutes: 20 });
	});

	test("a recording is never longer than 100 hours", () => {
		expect(secondsFromHoursMinutes(500, 0)).toBe(100 * 3600);
		expect(secondsFromHoursMinutes(-1, -5)).toBe(0);
	});

	test("time reads naturally", () => {
		expect(formatAudioTime(12000)).toBe("3 h 20 min");
		expect(formatAudioTime(2700)).toBe("45 min");
		expect(formatAudioTime(7200)).toBe("2 h");
	});

	test("percent comes from time and is kept between 0 and 100", () => {
		expect(percentFromSeconds(6000, 12000)).toBe(50);
		expect(percentFromSeconds(99999, 12000)).toBe(100);
		expect(percentFromSeconds(10, 0)).toBe(0);
	});

	test("the position stays inside the recording", () => {
		expect(clampAudioPosition(13000, 12000)).toBe(12000);
		expect(clampAudioPosition(-5, 12000)).toBe(0);
	});
});

describe("editionFormatFromText", () => {
	test("Open Library's free text becomes one of our formats", () => {
		expect(editionFormatFromText("Audio CD")).toBe("audiobook");
		expect(editionFormatFromText("Hardcover")).toBe("hardcover");
		expect(editionFormatFromText("Mass Market Paperback")).toBe("paperback");
		expect(editionFormatFromText("Kindle Edition")).toBe("ebook");
		expect(editionFormatFromText("Spiral-bound")).toBe("other");
		expect(editionFormatFromText("  ")).toBeNull();
		expect(editionFormatFromText(null)).toBeNull();
	});
});
