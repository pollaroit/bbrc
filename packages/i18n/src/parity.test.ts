import { describe, expect, test } from "bun:test";
import { describeMessage, findProblems, flattenMessages } from "./parity";

describe("message parity", () => {
	test("the shipped languages match English", () => {
		expect(findProblems()).toEqual([]);
	});

	test("reports a missing key, an extra key, changed arguments and a bad plural form", () => {
		const catalog = (locale: string) =>
			locale === "en"
				? {
						a: "Hello {name}",
						b: "{n, plural, one {# x} other {# xs}}",
						c: "Same",
					}
				: { a: "Salam", b: "{n, plural, few {# x} one {# x}}", d: "Extra" };
		const problems = findProblems(catalog as never);
		expect(problems).toContain('az: missing key "c"');
		expect(problems).toContain('az: extra key "d" (not in English)');
		expect(
			problems.some((line) =>
				line.includes('"a" takes {} but English takes {name}'),
			),
		).toBe(true);
		// A plural without "other" is rejected by the message parser itself.
		expect(
			problems.some((line) => line.includes('"b" is not a valid message')),
		).toBe(true);
	});

	test("reports a plural form the language does not have", () => {
		const catalog = (locale: string) =>
			locale === "en"
				? { b: "{n, plural, one {# x} other {# xs}}" }
				: { b: "{n, plural, few {# x} other {# xs}}" };
		expect(
			findProblems(catalog as never).some((line) =>
				line.includes('uses "few"'),
			),
		).toBe(true);
	});

	test("flattens a tree into dotted keys", () => {
		expect(flattenMessages({ a: { b: "x", c: "y" } })).toEqual({
			"a.b": "x",
			"a.c": "y",
		});
	});

	test("reads arguments and plural forms", () => {
		const shape = describeMessage(
			"{name} read {count, plural, one {# book} other {# books}}",
		);
		expect(shape.args).toEqual({ name: "value", count: "plural" });
		expect(shape.pluralForms.count).toEqual(["one", "other"]);
	});

	test("a plural without an other form is reported by the shape", () => {
		expect(
			describeMessage("{n, plural, one {# x} =0 {none} other {# xs}}")
				.pluralForms.n,
		).toEqual(["=0", "one", "other"]);
	});
});
