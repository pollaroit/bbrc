import { describe, expect, test } from "bun:test";
import { authPageHref, safeCallbackUrl } from "./auth-callback-url";

describe("safeCallbackUrl", () => {
	test("keeps internal paths", () => {
		expect(safeCallbackUrl("/books/x?tab=a")).toBe("/books/x?tab=a");
		expect(safeCallbackUrl(encodeURIComponent("/books/x?tab=a"))).toBe(
			"/books/x?tab=a",
		);
	});

	test("drops the language prefix so the router can add it back", () => {
		expect(safeCallbackUrl("/az/books/x")).toBe("/books/x");
		expect(safeCallbackUrl("/az")).toBe("/");
	});

	test("never leaves the site", () => {
		for (const raw of [
			"https://evil.com",
			"//evil.com",
			"/\\evil.com",
			"/az//evil.com",
			"evil",
			"%E0%A4%A",
		]) {
			expect(safeCallbackUrl(raw)).toBe("/");
		}
	});

	test("auth pages are never a way back, in any language", () => {
		for (const raw of [
			"/sign-in",
			"/sign-up?x=1",
			"/az/sign-in",
			"/az/sign-up?callback_url=%2F",
		]) {
			expect(safeCallbackUrl(raw)).toBe("/");
		}
	});
});

describe("authPageHref", () => {
	test("adds the way back", () => {
		expect(authPageHref("/sign-in")).toBe("/sign-in");
		expect(authPageHref("/sign-in", "/books/x")).toBe(
			"/sign-in?callback_url=%2Fbooks%2Fx",
		);
	});

	test("keeps the language when asked", () => {
		expect(authPageHref("/sign-in", "/books/x", "az")).toBe(
			"/az/sign-in?callback_url=%2Fbooks%2Fx",
		);
		expect(authPageHref("/sign-up", null, "az")).toBe("/az/sign-up");
		expect(authPageHref("/sign-in", "/az/books/x", "en")).toBe(
			"/sign-in?callback_url=%2Fbooks%2Fx",
		);
	});
});
