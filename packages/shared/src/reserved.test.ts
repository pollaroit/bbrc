import { describe, expect, it } from "bun:test";
import { isReservedKeyword, RESERVED_KEYWORDS } from "./reserved";
import { generateUniqueSlug } from "./slug";

describe("reserved keywords", () => {
	it("matches the shared list without caring about case", () => {
		expect(isReservedKeyword("Admin")).toBe(true);
		expect(isReservedKeyword("wishlist")).toBe(true);
		expect(isReservedKeyword("bbrc")).toBe(true);
		expect(isReservedKeyword("public")).toBe(true);
		expect(isReservedKeyword("c")).toBe(true);
		expect(isReservedKeyword("mehdi")).toBe(false);
		expect(isReservedKeyword("admin1")).toBe(false);
	});

	it("has no duplicate entries", () => {
		expect(new Set(RESERVED_KEYWORDS).size).toBe(RESERVED_KEYWORDS.length);
	});
});

describe("generateUniqueSlug", () => {
	it("skips a reserved base and uses a numeric suffix", async () => {
		const slug = await generateUniqueSlug("Admin", async () => true);
		expect(slug).toBe("admin1");
		expect(isReservedKeyword(slug)).toBe(false);
	});
});
