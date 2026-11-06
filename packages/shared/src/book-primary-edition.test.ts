import { describe, expect, it } from "bun:test";
import { pickNextPrimaryEdition } from "./book-primary-edition";

const edition = (
	id: string,
	status: "member" | "verified",
	createdAt: string,
) => ({ id, status, createdAt });

describe("pickNextPrimaryEdition", () => {
	it("takes the oldest verified edition", () => {
		expect(
			pickNextPrimaryEdition(
				[
					edition("a", "verified", "2026-01-03"),
					edition("b", "member", "2026-01-01"),
					edition("c", "verified", "2026-01-02"),
					edition("gone", "verified", "2025-12-01"),
				],
				"gone",
			),
		).toBe("c");
	});

	it("falls back to the oldest edition of any kind", () => {
		expect(
			pickNextPrimaryEdition(
				[
					edition("a", "member", "2026-02-01"),
					edition("b", "member", "2026-01-01"),
					edition("gone", "verified", "2025-12-01"),
				],
				"gone",
			),
		).toBe("b");
	});

	it("returns null when the removed edition was the only one", () => {
		expect(
			pickNextPrimaryEdition(
				[edition("gone", "verified", "2026-01-01")],
				"gone",
			),
		).toBeNull();
		expect(pickNextPrimaryEdition([], "x")).toBeNull();
	});
});
