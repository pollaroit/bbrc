import { describe, expect, test } from "bun:test";
import { bookCountryOptions, getBookCountryName } from "./book-country";

describe("country names", () => {
	test("English keeps the country list's names", () => {
		expect(getBookCountryName("GB")).toBe("United Kingdom");
		expect(getBookCountryName("zz")).toBeNull();
	});

	test("Azerbaijani names differ from English", () => {
		for (const code of ["AZ", "TR", "RU", "GB", "US"]) {
			expect(getBookCountryName(code, "az")).not.toBe(getBookCountryName(code));
		}
		expect(getBookCountryName("TR", "az")).toBe("Türkiyə");
	});

	test("options are named and sorted in the language", () => {
		const az = bookCountryOptions("az");
		expect(az.find((row) => row.alpha2 === "RU")?.name).toBe("Rusiya");
		const names = az.map((row) => row.name);
		expect(names).toEqual(
			[...names].sort((a, b) => a.localeCompare(b, "az-AZ")),
		);
	});
});
