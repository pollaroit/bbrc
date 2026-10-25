import { describe, expect, test } from "bun:test";
import { isbn10To13, isbn13To10, isbnPair } from "./isbn";

describe("isbn conversion", () => {
	test("10 to 13", () => {
		expect(isbn10To13("0-306-40615-2")).toBe("9780306406157");
		expect(isbn10To13("080442957X")).toBe("9780804429573");
	});
	test("13 to 10", () => {
		expect(isbn13To10("9780306406157")).toBe("0306406152");
		expect(isbn13To10("9780804429573")).toBe("080442957X");
	});
	test("979 has no ISBN-10", () => {
		expect(isbn13To10("9791090636071")).toBeNull();
	});
	test("pair from either form", () => {
		expect(isbnPair("0306406152")).toEqual({
			isbn13: "9780306406157",
			isbn10: "0306406152",
		});
		expect(isbnPair("978-0-306-40615-7")).toEqual({
			isbn13: "9780306406157",
			isbn10: "0306406152",
		});
		expect(isbnPair("12345")).toEqual({ isbn13: null, isbn10: null });
	});
});
