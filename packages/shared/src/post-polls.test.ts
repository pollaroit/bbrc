import { describe, expect, test } from "bun:test";
import {
	ballotAccess,
	canSeeResults,
	isTighterOrEqualBallotVisibility,
	normalizeChoiceLimits,
	pollEnded,
	refDedupeKey,
	searchPollCountries,
	tallyBallots,
	textDedupeKey,
	validateBallot,
	validatePollSetup,
} from "./post-polls";

const viewer = (over: Partial<Parameters<typeof canSeeResults>[1]> = {}) => ({
	isOwner: false,
	isAdmin: false,
	hasVoted: false,
	ended: false,
	...over,
});

describe("results visibility", () => {
	test("everyone sees, owner and admins always see", () => {
		expect(canSeeResults("everyone", viewer())).toBe(true);
		expect(canSeeResults("owner", viewer())).toBe(false);
		expect(canSeeResults("owner", viewer({ isOwner: true }))).toBe(true);
		expect(canSeeResults("owner", viewer({ isAdmin: true }))).toBe(true);
	});

	test("voters need to have voted, after_deadline needs the end", () => {
		expect(canSeeResults("voters", viewer())).toBe(false);
		expect(canSeeResults("voters", viewer({ hasVoted: true }))).toBe(true);
		expect(canSeeResults("after_deadline", viewer({ hasVoted: true }))).toBe(
			false,
		);
		expect(canSeeResults("after_deadline", viewer({ ended: true }))).toBe(true);
	});

	test("a poll ends at its deadline or when closed", () => {
		const now = new Date("2026-10-26T10:00:00Z");
		expect(pollEnded({ deadline: null, closedAt: null }, now)).toBe(false);
		expect(
			pollEnded(
				{ deadline: new Date("2026-10-26T10:00:00Z"), closedAt: null },
				now,
			),
		).toBe(true);
		expect(
			pollEnded(
				{ deadline: new Date("2026-10-27T10:00:00Z"), closedAt: now },
				now,
			),
		).toBe(true);
	});
});

describe("ballot layers", () => {
	const v = (over = {}) => ({
		isOwner: false,
		isAdmin: false,
		hasVoted: false,
		resultsVisible: true,
		...over,
	});

	test("secret hides everything, even from the owner", () => {
		expect(ballotAccess("secret", v({ isOwner: true }))).toBe("none");
		expect(ballotAccess("secret", v({ isAdmin: true }))).toBe("none");
	});

	test("turnout shows who voted, not what, and only to staff", () => {
		expect(ballotAccess("turnout", v({ isOwner: true }))).toBe("turnout");
		expect(ballotAccess("turnout", v({ isAdmin: true }))).toBe("turnout");
		expect(ballotAccess("turnout", v({ hasVoted: true }))).toBe("none");
	});

	test("owner layer shows ballots to staff only", () => {
		expect(ballotAccess("owner", v({ isOwner: true }))).toBe("ballots");
		expect(ballotAccess("owner", v({ hasVoted: true }))).toBe("none");
	});

	test("voters layer needs a vote and visible results", () => {
		expect(ballotAccess("voters", v())).toBe("none");
		expect(ballotAccess("voters", v({ hasVoted: true }))).toBe("ballots");
		expect(
			ballotAccess("voters", v({ hasVoted: true, resultsVisible: false })),
		).toBe("none");
	});

	test("public needs visible results so hidden tallies cannot leak", () => {
		expect(ballotAccess("public", v())).toBe("ballots");
		expect(ballotAccess("public", v({ resultsVisible: false }))).toBe("none");
		expect(
			ballotAccess("public", v({ resultsVisible: false, isOwner: true })),
		).toBe("ballots");
	});

	test("privacy can only be tightened once votes exist", () => {
		expect(isTighterOrEqualBallotVisibility("secret", "public")).toBe(true);
		expect(isTighterOrEqualBallotVisibility("public", "owner")).toBe(false);
		expect(isTighterOrEqualBallotVisibility("owner", "owner")).toBe(true);
	});
});

describe("ballots", () => {
	const valid = new Set(["a", "b", "c", "d"]);

	test("single needs exactly one", () => {
		const cfg = { type: "single" as const, minChoices: 1, maxChoices: 1 };
		expect(validateBallot(cfg, ["a"], valid)).toBeNull();
		expect(validateBallot(cfg, [], valid)).not.toBeNull();
		expect(validateBallot(cfg, ["a", "b"], valid)).not.toBeNull();
	});

	test("multiple and ranking respect min and max, no repeats, no strangers", () => {
		const cfg = { type: "ranking" as const, minChoices: 2, maxChoices: 3 };
		expect(validateBallot(cfg, ["a"], valid)).toContain("at least 2");
		expect(validateBallot(cfg, ["a", "b", "c", "d"], valid)).toContain(
			"at most 3",
		);
		expect(validateBallot(cfg, ["a", "a"], valid)).toContain("only once");
		expect(validateBallot(cfg, ["a", "z"], valid)).toContain(
			"not on this poll",
		);
		expect(validateBallot(cfg, ["c", "a"], valid)).toBeNull();
	});

	test("limits are clamped to the type and options", () => {
		expect(normalizeChoiceLimits("single", 3, 5, 6)).toEqual({
			minChoices: 1,
			maxChoices: 1,
		});
		expect(normalizeChoiceLimits("multiple", 0, 99, 4)).toEqual({
			minChoices: 1,
			maxChoices: 4,
		});
		expect(normalizeChoiceLimits("ranking", 5, 3, 6)).toEqual({
			minChoices: 3,
			maxChoices: 3,
		});
	});
});

describe("tallies", () => {
	test("single choice counts voters and shares", () => {
		const result = tallyBallots(
			{ type: "single", minChoices: 1, maxChoices: 1 },
			["a", "b"],
			[
				{ userId: "u1", optionId: "a", rank: null },
				{ userId: "u2", optionId: "a", rank: null },
				{ userId: "u3", optionId: "b", rank: null },
			],
		);
		expect(result.totalVoters).toBe(3);
		expect(result.options[0]?.voters).toBe(2);
		expect(result.options[0]?.share).toBeCloseTo(2 / 3);
	});

	test("multiple choice shares are of voters and can add up past 100%", () => {
		const result = tallyBallots(
			{ type: "multiple", minChoices: 1, maxChoices: 2 },
			["a", "b"],
			[
				{ userId: "u1", optionId: "a", rank: null },
				{ userId: "u1", optionId: "b", rank: null },
				{ userId: "u2", optionId: "a", rank: null },
			],
		);
		expect(result.totalVoters).toBe(2);
		expect(result.options[0]?.share).toBe(1);
		expect(result.options[1]?.share).toBe(0.5);
	});

	test("ranking uses Borda points with the most positions as the top score", () => {
		const cfg = { type: "ranking" as const, minChoices: 1, maxChoices: 3 };
		const result = tallyBallots(
			cfg,
			["a", "b", "c"],
			[
				{ userId: "u1", optionId: "a", rank: 1 },
				{ userId: "u1", optionId: "b", rank: 2 },
				{ userId: "u1", optionId: "c", rank: 3 },
				{ userId: "u2", optionId: "b", rank: 1 },
				{ userId: "u2", optionId: "a", rank: 2 },
			],
		);
		const [a, b, c] = result.options;
		expect(a?.points).toBe(3 + 2);
		expect(b?.points).toBe(2 + 3);
		expect(c?.points).toBe(1);
		expect(a?.firstChoices).toBe(1);
		expect(b?.rankSum).toBe(3);
		expect(result.totalVoters).toBe(2);
		expect((a?.share ?? 0) + (b?.share ?? 0) + (c?.share ?? 0)).toBeCloseTo(1);
	});
});

describe("duplicates", () => {
	test("text ignores case, spacing and punctuation", () => {
		expect(textDedupeKey("  Dune! ")).toBe(textDedupeKey("dune"));
		expect(textDedupeKey("The  Hobbit")).toBe(textDedupeKey("the hobbit."));
		expect(textDedupeKey("Dune")).not.toBe(textDedupeKey("Dune Messiah"));
	});

	test("attachments key on kind and target", () => {
		expect(refDedupeKey("author", "ursula-k-le-guin")).toBe(
			"author:ursula-k-le-guin",
		);
	});
});

describe("setup validation", () => {
	const base = {
		type: "single" as const,
		optionKind: "text" as const,
		optionCount: 3,
		minChoices: 1,
		maxChoices: 1,
		allowUserOptions: false,
		maxOptionsPerUser: null,
		maxOptionsTotal: null,
		resultsVisibility: "everyone" as const,
		deadline: null,
	};
	const now = new Date("2026-10-26T10:00:00Z");

	test("valid poll passes", () => {
		expect(validatePollSetup(base, now)).toBeNull();
	});

	test("needs enough options", () => {
		expect(validatePollSetup({ ...base, optionCount: 1 }, now)).toContain(
			"at least 2",
		);
	});

	test("after-deadline results need a deadline", () => {
		expect(
			validatePollSetup({ ...base, resultsVisibility: "after_deadline" }, now),
		).toContain("deadline");
	});

	test("deadline must be in range", () => {
		expect(
			validatePollSetup(
				{ ...base, deadline: new Date(now.getTime() + 60_000) },
				now,
			),
		).toContain("at least");
		expect(
			validatePollSetup(
				{ ...base, deadline: new Date(now.getTime() + 200 * 864e5) },
				now,
			),
		).toContain("at most");
	});

	test("member-added options need limits that fit together", () => {
		const open = { ...base, allowUserOptions: true };
		expect(validatePollSetup(open, now)).toContain("how many");
		expect(
			validatePollSetup(
				{ ...open, maxOptionsPerUser: 3, maxOptionsTotal: 2 },
				now,
			),
		).toContain("cannot be higher");
		expect(
			validatePollSetup(
				{ ...open, maxOptionsPerUser: 2, maxOptionsTotal: 3 },
				now,
			),
		).toBeNull();
	});
});

describe("countries", () => {
	test("searches by name and code", () => {
		expect(searchPollCountries("germ")[0]?.code).toBe("DE");
		expect(searchPollCountries("fr").some((c) => c.code === "FR")).toBe(true);
		expect(searchPollCountries("")).toEqual([]);
	});
});
