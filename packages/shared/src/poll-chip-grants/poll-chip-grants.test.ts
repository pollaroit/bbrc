import { describe, expect, test } from "bun:test";
import { computePollChipGrants, validatePollVoteSubmission } from "./index";

const allowed = new Set(["a", "b", "c"]);

describe("computePollChipGrants", () => {
	test("single participant gets golden and silver", () => {
		const grants = computePollChipGrants([{ userId: "a", rp: 10 }]);
		expect(grants.get("a")).toEqual({
			canUseGolden: true,
			canUseSilver: true,
		});
	});

	test("two participants same RP both get golden and silver", () => {
		const grants = computePollChipGrants([
			{ userId: "a", rp: 5 },
			{ userId: "b", rp: 5 },
		]);
		expect(grants.get("a")).toEqual({
			canUseGolden: true,
			canUseSilver: true,
		});
		expect(grants.get("b")).toEqual({
			canUseGolden: true,
			canUseSilver: true,
		});
	});

	test("two participants different RP", () => {
		const grants = computePollChipGrants([
			{ userId: "a", rp: 10 },
			{ userId: "b", rp: 3 },
		]);
		expect(grants.get("a")).toEqual({
			canUseGolden: true,
			canUseSilver: true,
		});
		expect(grants.get("b")).toEqual({
			canUseGolden: false,
			canUseSilver: true,
		});
	});

	test("three-way tie at top gives all golden and silver", () => {
		const grants = computePollChipGrants([
			{ userId: "a", rp: 1 },
			{ userId: "b", rp: 1 },
			{ userId: "c", rp: 1 },
		]);
		for (const id of ["a", "b", "c"]) {
			expect(grants.get(id)).toEqual({
				canUseGolden: true,
				canUseSilver: true,
			});
		}
	});

	test("second distinct RP tier gets silver only", () => {
		const grants = computePollChipGrants([
			{ userId: "a", rp: 10 },
			{ userId: "b", rp: 8 },
			{ userId: "c", rp: 8 },
			{ userId: "d", rp: 2 },
		]);
		expect(grants.get("a")).toEqual({
			canUseGolden: true,
			canUseSilver: true,
		});
		expect(grants.get("b")).toEqual({
			canUseGolden: false,
			canUseSilver: true,
		});
		expect(grants.get("c")).toEqual({
			canUseGolden: false,
			canUseSilver: true,
		});
		expect(grants.get("d")).toEqual({
			canUseGolden: false,
			canUseSilver: false,
		});
	});
});

describe("validatePollVoteSubmission", () => {
	test("rejects golden chip without grant", () => {
		const result = validatePollVoteSubmission({
			votes: [{ optionId: "a", points: 3 }],
			grants: { canUseGolden: false, canUseSilver: false },
			minChoices: 1,
			maxChoices: 3,
			allowedOptionIds: allowed,
		});
		expect(result.ok).toBe(false);
	});

	test("allows golden and silver on different options", () => {
		const result = validatePollVoteSubmission({
			votes: [
				{ optionId: "a", points: 3 },
				{ optionId: "b", points: 2 },
				{ optionId: "c", points: 1 },
			],
			grants: { canUseGolden: true, canUseSilver: true },
			minChoices: 1,
			maxChoices: 3,
			allowedOptionIds: allowed,
		});
		expect(result.ok).toBe(true);
	});

	test("rejects two golden chips", () => {
		const result = validatePollVoteSubmission({
			votes: [
				{ optionId: "a", points: 3 },
				{ optionId: "b", points: 3 },
			],
			grants: { canUseGolden: true, canUseSilver: true },
			minChoices: 1,
			maxChoices: 3,
			allowedOptionIds: allowed,
		});
		expect(result.ok).toBe(false);
	});
});
