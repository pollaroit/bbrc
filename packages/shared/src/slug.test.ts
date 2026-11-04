import { describe, expect, it } from "bun:test";
import { generateSlug, mapAzerbaijaniToLatin } from "./slug";

describe("Azerbaijani slugs", () => {
	it("maps Azerbaijani letters to Latin", () => {
		expect(mapAzerbaijaniToLatin("əıöüçşğ")).toBe("eiouchshg");
		expect(generateSlug("Çağdaş Şəhər")).toBe("chagdash_sheher");
	});
});
