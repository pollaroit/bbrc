import { describe, expect, it } from "bun:test";
import { resolveRpLevel, resolveXpLevel } from "./member-levels";

describe("resolveXpLevel", () => {
	it("maps boundary values", () => {
		expect(resolveXpLevel(0).label).toBe("Wallflower");
		expect(resolveXpLevel(9).label).toBe("Wallflower");
		expect(resolveXpLevel(10).label).toBe("Newcomer");
		expect(resolveXpLevel(24).label).toBe("Newcomer");
		expect(resolveXpLevel(25).label).toBe("Participant");
		expect(resolveXpLevel(99).label).toBe("Participant");
		expect(resolveXpLevel(100).label).toBe("Regular");
		expect(resolveXpLevel(9999).label).toBe("Luminary");
		expect(resolveXpLevel(10000).label).toBe("Institution");
	});

	it("clamps negative input", () => {
		expect(resolveXpLevel(-3).label).toBe("Wallflower");
	});
});

describe("resolveRpLevel", () => {
	it("maps boundary values", () => {
		expect(resolveRpLevel(0).label).toBe("Page One");
		expect(resolveRpLevel(9).label).toBe("Page One");
		expect(resolveRpLevel(10).label).toBe("Bookmark");
		expect(resolveRpLevel(7499).label).toBe("Living Library");
		expect(resolveRpLevel(7500).label).toBe("Grand Reader");
	});

	it("uses names distinct from XP tiers", () => {
		expect(resolveRpLevel(0).label).not.toBe(resolveXpLevel(0).label);
		expect(resolveRpLevel(500).label).not.toBe(resolveXpLevel(500).label);
	});
});
