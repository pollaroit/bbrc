import { describe, expect, test } from "bun:test";
import {
	localeFromHeader,
	recipientLocale,
	resolveRequestLocale,
} from "./locale";

describe("request and recipient language", () => {
	test("an unknown or missing header is English", () => {
		expect(localeFromHeader("az")).toBe("az");
		expect(localeFromHeader("fr")).toBe("en");
		expect(localeFromHeader(null)).toBe("en");
	});

	test("the request language defaults to English", () => {
		expect(resolveRequestLocale({})).toBe("en");
		expect(resolveRequestLocale({ locale: "az" })).toBe("az");
	});

	test("text for somebody else uses the language they saved", () => {
		expect(recipientLocale({ locale: "az" })).toBe("az");
		expect(recipientLocale({ locale: "xx" })).toBe("en");
		expect(recipientLocale({})).toBe("en");
	});
});
