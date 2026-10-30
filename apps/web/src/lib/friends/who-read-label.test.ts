import { expect, test } from "bun:test";
import { whoReadLabel } from "./who-read-label";

const ann = { name: "Ann", state: "read" as const };
const bob = { name: "Bob", state: "read" as const };
const cy = { name: "Cy", state: "reading" as const };

test("wording", () => {
	expect(whoReadLabel([], 0)).toBe("");
	expect(whoReadLabel([ann], 1)).toBe("Ann read this");
	expect(whoReadLabel([cy], 1)).toBe("Cy is reading this");
	expect(whoReadLabel([ann, bob], 2)).toBe("Ann and Bob read this");
	expect(whoReadLabel([ann, bob, cy], 5)).toBe(
		"Ann, Bob and 3 other friends are reading this",
	);
	expect(whoReadLabel([ann, bob], 3)).toBe(
		"Ann, Bob and 1 other friend read this",
	);
});
