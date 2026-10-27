import { describe, expect, test } from "bun:test";
import {
	cleanEditionLabel,
	formatEditionLanguage,
	normalizeLanguageCode,
} from "./edition-language";

describe("formatEditionLanguage", () => {
	test("Open Library keys and bare codes", () => {
		expect(formatEditionLanguage("/languages/tur")).toBe("Turkish");
		expect(formatEditionLanguage("tur")).toBe("Turkish");
		expect(formatEditionLanguage("/languages/aze")).toBe("Azerbaijani");
		expect(formatEditionLanguage("ENG")).toBe("English");
		expect(formatEditionLanguage("/languages/fre")).toBe("French");
	});
	test("unknown codes fall back safely", () => {
		expect(formatEditionLanguage("xyz")).toBe("XYZ");
		expect(formatEditionLanguage("")).toBe("");
		expect(formatEditionLanguage(null)).toBe("");
	});
	test("normalizes the key", () => {
		expect(normalizeLanguageCode("/languages/Tur")).toBe("tur");
	});
});

describe("cleanEditionLabel", () => {
	test("replaces a raw language segment", () => {
		expect(cleanEditionLabel("Penguin · 2003 · /languages/tur")).toBe(
			"Penguin · 2003 · Turkish",
		);
		expect(cleanEditionLabel("Penguin · 2003 · eng")).toBe(
			"Penguin · 2003 · English",
		);
	});
	test("leaves other labels alone", () => {
		expect(cleanEditionLabel("Dtv · 1999")).toBe("Dtv · 1999");
		expect(cleanEditionLabel(null)).toBeNull();
	});
});

describe("in another language", () => {
	test("language names follow the language, English stays as it was", () => {
		expect(formatEditionLanguage("/languages/tur", "az")).toBe("Türk dili");
		expect(formatEditionLanguage("tur")).toBe("Turkish");
		expect(cleanEditionLabel("Penguin · 2003 · /languages/rus", "az")).toBe(
			"Penguin · 2003 · Rus dili",
		);
	});
});
