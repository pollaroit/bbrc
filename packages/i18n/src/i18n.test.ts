import { describe, expect, test } from "bun:test";
import { DEFAULT_LOCALE, isLocale, LOCALES, toLocale } from "./locales";
import { getMessages, type Messages, pickMessages } from "./messages";
import { createServerTranslator } from "./server";

describe("locales", () => {
	test("English is the default and the only unprefixed language", () => {
		expect(DEFAULT_LOCALE).toBe("en");
		expect(LOCALES).toContain("az");
	});

	test("unknown values fall back to English", () => {
		expect(isLocale("az")).toBe(true);
		expect(isLocale("fr")).toBe(false);
		expect(toLocale("fr")).toBe("en");
		expect(toLocale(undefined)).toBe("en");
	});
});

describe("messages", () => {
	test("every language is available and picking keeps only the asked namespaces", () => {
		for (const locale of LOCALES) {
			expect(getMessages(locale).language.title.length).toBeGreaterThan(0);
		}
		expect(Object.keys(pickMessages("az", ["language"]))).toEqual(["language"]);
	});

	test("a language that misses a key does not type-check", () => {
		// @ts-expect-error the `language` namespace needs every key English has
		const broken: Messages = { language: { title: "x" } };
		expect(broken).toBeDefined();
	});

	test("the server translator formats parameters", () => {
		expect(
			createServerTranslator("en", "language")("current", {
				language: "English",
			}),
		).toBe("Current language: English");
		expect(
			createServerTranslator("az", "language")("current", {
				language: "Azərbaycanca",
			}),
		).toBe("Hazırkı dil: Azərbaycanca");
	});
});

describe("validation messages", () => {
	test("follow the resolver and take parameters", async () => {
		const { setValidationLocaleResolver, validationMessage } = await import(
			"./validation"
		);
		setValidationLocaleResolver(() => "en");
		expect(validationMessage("goal.yearOnly", { min: 2025, max: 2026 })).toBe(
			"A goal can only be set for 2025 or 2026.",
		);
		setValidationLocaleResolver(() => "az");
		expect(validationMessage("goal.yearOnly", { min: 2025, max: 2026 })).toBe(
			"Məqsəd yalnız 2025 və ya 2026 üçün qoyula bilər.",
		);
		setValidationLocaleResolver(() => "en");
	});
});
