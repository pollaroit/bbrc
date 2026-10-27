import { describe, expect, test } from "bun:test";
import { languageName, regionName } from "./display-names";

describe("country and language names", () => {
	test("countries follow the language", () => {
		expect(regionName("en", "TR")).not.toBe(regionName("az", "TR"));
		expect(regionName("az", "AZ")).toBe("Azərbaycan");
		expect(regionName("az", "RU")).toBe("Rusiya");
		expect(regionName("az", "GB")).toBe("Birləşmiş Krallıq");
		expect(regionName("az", "US")).toBe("Amerika Birləşmiş Ştatları");
		expect(regionName("en", "GB")).toBe("United Kingdom");
	});

	test("languages follow the language, including Open Library's bibliographic codes", () => {
		expect(languageName("en", "tur")).toBe("Turkish");
		expect(languageName("az", "tur")).toBe("Türk dili");
		expect(languageName("az", "aze")).toBe("Azərbaycan dili");
		expect(languageName("az", "rus")).toBe("Rus dili");
		expect(languageName("en", "fre")).toBe("French");
		expect(languageName("az", "ger")).not.toBe(languageName("en", "ger"));
	});

	test("unknown codes give null so callers can fall back", () => {
		expect(regionName("az", "ZZZZ")).toBeNull();
		expect(languageName("az", "xx-not-a-language")).toBeNull();
	});
});
