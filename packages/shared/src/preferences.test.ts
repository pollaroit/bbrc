import { describe, expect, test } from "bun:test";
import {
	arePreferencesDefault,
	buildBootScript,
	DEFAULT_PREFERENCES,
	normalizePreferences,
} from "./preferences";

describe("normalizePreferences", () => {
	test("junk becomes the defaults", () => {
		expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
		expect(normalizePreferences("nope")).toEqual(DEFAULT_PREFERENCES);
		expect(normalizePreferences({ appearance: 5 })).toEqual(
			DEFAULT_PREFERENCES,
		);
	});

	test("keeps valid values and replaces invalid ones", () => {
		const result = normalizePreferences({
			appearance: { palette: "vercel", fontBody: "not-a-font", textSize: "xl" },
			accessibility: { motion: "reduce", contrast: "loud" },
			time: { clock: "12h" },
		});
		expect(result.appearance.palette).toBe("vercel");
		expect(result.appearance.fontBody).toBe("geist-mono");
		expect(result.appearance.textSize).toBe("xl");
		expect(result.accessibility).toEqual({
			motion: "reduce",
			contrast: "normal",
		});
		expect(result.time).toEqual({ zone: "club", clock: "12h" });
	});

	test("is idempotent", () => {
		const once = normalizePreferences({ appearance: { palette: "mono" } });
		expect(normalizePreferences(once)).toEqual(once);
	});

	test("detects the default set", () => {
		expect(arePreferencesDefault(DEFAULT_PREFERENCES)).toBe(true);
		expect(
			arePreferencesDefault(
				normalizePreferences({ appearance: { palette: "mono" } }),
			),
		).toBe(false);
	});
});

describe("buildBootScript", () => {
	test("is valid JavaScript and locks modes", () => {
		const script = buildBootScript({ terminal: "dark" });
		expect(() => new Function(script)).not.toThrow();
		expect(script).toContain('"terminal":"dark"');
	});
});
