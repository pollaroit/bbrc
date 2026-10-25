import { describe, expect, test } from "bun:test";
import {
	endPosition,
	formatSeriesNumber,
	placementToSlot,
	previewSeriesPlacement,
	slotToPlacement,
} from "./series-placement";

const books = [
	{ slug: "a", title: "Alpha", position: 1 },
	{ slug: "b", title: "Beta", position: 2 },
	{ slug: "c", title: "Gamma", position: 3 },
];

describe("previewSeriesPlacement", () => {
	test("end of the series", () => {
		const preview = previewSeriesPlacement(
			books,
			{ position: null, shiftLater: false },
			"New",
		);
		expect(preview.position).toBe(4);
		expect(preview.error).toBeNull();
		expect(preview.rows.map((row) => row.title)).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
			"New",
		]);
	});

	test("a taken place moves the later books down", () => {
		const preview = previewSeriesPlacement(
			books,
			{ position: 2, shiftLater: true },
			"New",
		);
		expect(preview.error).toBeNull();
		expect(
			preview.rows.map((row) => [row.title, row.position, row.moved]),
		).toEqual([
			["Alpha", 1, false],
			["New", 2, false],
			["Beta", 3, true],
			["Gamma", 4, true],
		]);
	});

	test("a taken place without shifting is an error", () => {
		const preview = previewSeriesPlacement(
			books,
			{ position: 2, shiftLater: false },
			"New",
		);
		expect(preview.error).toContain("taken by “Beta”");
	});

	test("a taken half step is an error even with shifting", () => {
		const withHalf = [...books, { slug: "d", title: "Half", position: 1.5 }];
		const preview = previewSeriesPlacement(
			withHalf,
			{ position: 1.5, shiftLater: true },
			"New",
		);
		expect(preview.error).toContain("half step");
	});

	test("a free place needs no shifting", () => {
		const preview = previewSeriesPlacement(
			books,
			{ position: 1.5, shiftLater: false },
			"Novella",
		);
		expect(preview.error).toBeNull();
		expect(preview.rows.map((row) => row.title)).toEqual([
			"Alpha",
			"Novella",
			"Beta",
			"Gamma",
		]);
		expect(preview.rows.some((row) => row.moved)).toBe(false);
	});
});

describe("slots", () => {
	test("end position follows the last whole number", () => {
		expect(endPosition(books)).toBe(4);
		expect(
			endPosition([...books, { slug: "x", title: "X", position: 3.5 }]),
		).toBe(4);
		expect(endPosition([])).toBe(1);
	});

	test("slot to placement, whole numbers", () => {
		expect(slotToPlacement(books, 0, false)).toEqual({
			position: 1,
			shiftLater: true,
		});
		expect(slotToPlacement(books, 3, false)).toEqual({
			position: null,
			shiftLater: false,
		});
	});

	test("slot to placement, half steps", () => {
		expect(slotToPlacement(books, 1, true)).toEqual({
			position: 1.5,
			shiftLater: false,
		});
		expect(slotToPlacement(books, 0, true)).toEqual({
			position: 0.5,
			shiftLater: false,
		});
	});

	test("no room for a half step between 1 and 1.1", () => {
		const tight = [
			{ slug: "a", title: "A", position: 1 },
			{ slug: "b", title: "B", position: 1.1 },
		];
		expect(slotToPlacement(tight, 1, true)).toBeNull();
	});

	test("placement to slot", () => {
		expect(placementToSlot(books, { position: null, shiftLater: false })).toBe(
			3,
		);
		expect(placementToSlot(books, { position: 2, shiftLater: true })).toBe(1);
		expect(placementToSlot(books, { position: 1.5, shiftLater: false })).toBe(
			1,
		);
	});
});

describe("formatSeriesNumber", () => {
	test("whole and half", () => {
		expect(formatSeriesNumber(2)).toBe("#2");
		expect(formatSeriesNumber(1.5)).toBe("#1.5");
	});
});
