import { describe, expect, test } from "bun:test";
import {
	compareLength,
	estimateReadingMinutes,
	formatReadingTime,
} from "./book-about";

describe("reading time", () => {
	test("pages to minutes", () => {
		expect(estimateReadingMinutes(0)).toBe(0);
		expect(estimateReadingMinutes(100)).toBe(110);
		expect(estimateReadingMinutes(-5)).toBe(0);
	});
	test("formats minutes and half hours", () => {
		expect(formatReadingTime(0)).toBe("");
		expect(formatReadingTime(45)).toBe("45 min");
		expect(formatReadingTime(540)).toBe("9 h");
		expect(formatReadingTime(560)).toBe("9.5 h");
	});
});

describe("compareLength", () => {
	test("needs enough books", () => {
		expect(compareLength(2, 1, 4)).toBeNull();
	});
	test("longer than most", () => {
		expect(compareLength(80, 20, 100)).toEqual({
			direction: "longer",
			percent: 80,
		});
	});
	test("shorter than most", () => {
		expect(compareLength(10, 90, 100)).toEqual({
			direction: "shorter",
			percent: 90,
		});
	});
});
