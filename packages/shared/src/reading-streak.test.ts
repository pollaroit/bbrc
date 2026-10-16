import { describe, expect, it } from "bun:test";
import { computeReadingStreak } from "./reading-streak";

const t = (
	slug: string,
	progress: "completed" | "dnf" | "in_progress",
	ms: number,
) => ({
	sittingSlug: slug,
	progress,
	finishedAtMs: ms,
});

describe("computeReadingStreak", () => {
	it("returns zeros when empty", () => {
		expect(computeReadingStreak([])).toEqual({
			current: 0,
			best: 0,
			asOfSittingSlug: null,
			currentSittingSlugs: [],
			bestSittingSlugs: [],
		});
	});

	it("counts current streak from newest finished sittings", () => {
		const result = computeReadingStreak([
			t("c", "completed", 3),
			t("b", "completed", 2),
			t("a", "dnf", 1),
		]);
		expect(result.current).toBe(2);
		expect(result.asOfSittingSlug).toBe("c");
		expect(result.best).toBe(2);
		expect(result.currentSittingSlugs).toEqual(["c", "b"]);
		expect(result.bestSittingSlugs).toEqual(["b", "c"]);
	});

	it("resets current when latest sitting was not completed", () => {
		const result = computeReadingStreak([
			t("latest", "in_progress", 4),
			t("older", "completed", 3),
			t("oldest", "completed", 2),
		]);
		expect(result.current).toBe(0);
		expect(result.asOfSittingSlug).toBe(null);
		expect(result.best).toBe(2);
		expect(result.currentSittingSlugs).toEqual([]);
		expect(result.bestSittingSlugs).toEqual(["oldest", "older"]);
	});

	it("tracks best across older gaps", () => {
		const result = computeReadingStreak([
			t("d", "completed", 5),
			t("c", "dnf", 4),
			t("b", "completed", 3),
			t("a", "completed", 2),
		]);
		expect(result.current).toBe(1);
		expect(result.best).toBe(2);
	});
});
