import { describe, expect, test } from "bun:test";
import { appError } from "./app-error";
import { runWithLocale } from "./request-locale";

describe("appError", () => {
	test("the message follows the language of the request, the key and parameters stay stable", () => {
		const english = appError("UNAUTHORIZED", "common.notSignedIn");
		expect(english.message).toBe("You must be signed in to do this.");

		const azerbaijani = runWithLocale("az", () =>
			appError("UNAUTHORIZED", "common.notSignedIn"),
		);
		expect(azerbaijani.message).toBe(
			"Bunu etmək üçün hesabınıza daxil olmalısınız.",
		);
		expect(azerbaijani.data).toEqual({
			i18n: { key: "common.notSignedIn", params: {} },
		});
	});

	test("extra data is kept next to the key", () => {
		const error = appError("FORBIDDEN", "common.adminOnly", {
			data: { redirectUsername: "x" },
		});
		expect(error.data).toEqual({
			redirectUsername: "x",
			i18n: { key: "common.adminOnly", params: {} },
		});
	});
});
