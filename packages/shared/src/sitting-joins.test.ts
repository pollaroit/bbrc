import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SITTING_JOIN_CONFIG,
	inviteLinkState,
	joinTypeAllows,
	readingJoinCutoff,
	selfJoinWindow,
} from "./sitting-joins";

const day = 86_400_000;
const start = new Date("2026-11-01T00:00:00Z");
const deadline = new Date(start.getTime() + 10 * day);

const reading = (over = {}) => ({
	...DEFAULT_SITTING_JOIN_CONFIG,
	status: "reading" as const,
	readingStartedAt: start,
	deadline,
	...over,
});

describe("join window", () => {
	test("both phases are open by default", () => {
		expect(
			selfJoinWindow(
				{ ...reading(), status: "voting", readingStartedAt: null },
				start,
			).open,
		).toBe(true);
		expect(
			selfJoinWindow(reading(), new Date(start.getTime() + day)).open,
		).toBe(true);
	});

	test("finished sittings never take joins", () => {
		const window = selfJoinWindow({ ...reading(), status: "finished" }, start);
		expect(window).toEqual({ open: false, reason: "finished", closesAt: null });
	});

	test("a phase can be switched off", () => {
		expect(
			selfJoinWindow(
				{
					...reading({ joinInVoting: false }),
					status: "voting",
					readingStartedAt: null,
				},
				start,
			).reason,
		).toBe("voting_not_open_to_joins");
		expect(
			selfJoinWindow(reading({ joinInReading: false }), start).reason,
		).toBe("reading_not_open_to_joins");
	});

	test("reading closes after the chosen share of the reading period", () => {
		const cutoff = readingJoinCutoff(reading({ joinReadingUntilPercent: 50 }));
		expect(cutoff?.getTime()).toBe(start.getTime() + 5 * day);
		const before = selfJoinWindow(
			reading(),
			new Date(start.getTime() + 4 * day),
		);
		expect(before.open).toBe(true);
		expect(before.closesAt?.getTime()).toBe(cutoff?.getTime());
		const after = selfJoinWindow(
			reading(),
			new Date(start.getTime() + 6 * day),
		);
		expect(after).toMatchObject({
			open: false,
			reason: "reading_window_passed",
		});
	});

	test("100 percent means until the deadline", () => {
		const cutoff = readingJoinCutoff(reading({ joinReadingUntilPercent: 100 }));
		expect(cutoff?.getTime()).toBe(deadline.getTime());
	});

	test("the percentage is kept within 10 and 100", () => {
		const low = readingJoinCutoff(reading({ joinReadingUntilPercent: 0 }));
		expect(low?.getTime()).toBe(start.getTime() + day);
		const high = readingJoinCutoff(reading({ joinReadingUntilPercent: 500 }));
		expect(high?.getTime()).toBe(deadline.getTime());
	});
});

describe("join types", () => {
	test("who may use the button and who may use a link", () => {
		expect(joinTypeAllows("public", "button")).toBe(true);
		expect(joinTypeAllows("public", "link")).toBe(true);
		expect(joinTypeAllows("unlisted", "button")).toBe(false);
		expect(joinTypeAllows("unlisted", "link")).toBe(true);
		expect(joinTypeAllows("private", "button")).toBe(false);
		expect(joinTypeAllows("private", "link")).toBe(false);
	});
});

describe("invite links", () => {
	const now = new Date("2026-11-02T00:00:00Z");
	const link = { expiresAt: null, maxUses: null, uses: 0, revokedAt: null };

	test("states", () => {
		expect(inviteLinkState(link, now)).toBe("active");
		expect(inviteLinkState({ ...link, revokedAt: now }, now)).toBe("revoked");
		expect(
			inviteLinkState({ ...link, expiresAt: new Date(now.getTime() - 1) }, now),
		).toBe("expired");
		expect(inviteLinkState({ ...link, maxUses: 3, uses: 3 }, now)).toBe(
			"exhausted",
		);
		expect(inviteLinkState({ ...link, maxUses: 3, uses: 2 }, now)).toBe(
			"active",
		);
	});

	test("ending a link wins over the other reasons", () => {
		expect(
			inviteLinkState(
				{ expiresAt: new Date(0), maxUses: 1, uses: 1, revokedAt: now },
				now,
			),
		).toBe("revoked");
	});
});
