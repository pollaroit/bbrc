import { describe, expect, test } from "bun:test";
import {
	canApplyReportAction,
	REPORT_ACTIONS,
	REPORTS_PER_DAY,
	reportActionsFor,
	reporterTrack,
	reportLimitReached,
	sortReportGroups,
	statusAfterAction,
} from "./reports";

describe("statusAfterAction", () => {
	test("closing actions close, notes leave it alone, reopen opens", () => {
		expect(statusAfterAction("dismiss")).toBe("dismissed");
		expect(statusAfterAction("delete_content")).toBe("resolved");
		expect(statusAfterAction("warn_owner")).toBe("resolved");
		expect(statusAfterAction("ban_owner")).toBe("resolved");
		expect(statusAfterAction("note")).toBeNull();
		expect(statusAfterAction("reopen")).toBe("open");
	});
});

describe("canApplyReportAction", () => {
	test("an open report takes any action but reopen", () => {
		for (const action of REPORT_ACTIONS) {
			expect(canApplyReportAction("open", action)).toBe(action !== "reopen");
		}
	});

	test("a closed report can only be reopened or annotated", () => {
		for (const status of ["resolved", "dismissed"] as const) {
			for (const action of REPORT_ACTIONS) {
				expect(canApplyReportAction(status, action)).toBe(
					action === "reopen" || action === "note",
				);
			}
		}
	});
});

describe("reportActionsFor", () => {
	test("a profile cannot have its content deleted", () => {
		expect(reportActionsFor("user")).not.toContain("delete_content");
		expect(reportActionsFor("post")).toContain("delete_content");
	});
});

describe("reporterTrack", () => {
	test("no closed reports", () => {
		expect(
			reporterTrack({ resolved: 0, dismissed: 0 }).dismissedShare,
		).toBeNull();
	});

	test("share of dismissed reports", () => {
		const track = reporterTrack({ resolved: 1, dismissed: 3 });
		expect(track.closed).toBe(4);
		expect(track.dismissedShare).toBe(0.75);
		expect(track.label).toBe("3 of 4 dismissed");
	});
});

describe("reportLimitReached", () => {
	test("the daily allowance is inclusive", () => {
		expect(reportLimitReached(REPORTS_PER_DAY - 1)).toBe(false);
		expect(reportLimitReached(REPORTS_PER_DAY)).toBe(true);
	});
});

describe("sortReportGroups", () => {
	const at = (day: number) => new Date(2026, 10, day);
	const groups = [
		{ id: "a", latestAt: at(3), count: 1, ownerReports: 5 },
		{ id: "b", latestAt: at(1), count: 4, ownerReports: 4 },
		{ id: "c", latestAt: at(2), count: 4, ownerReports: 9 },
	];
	const ids = (
		by: Parameters<typeof sortReportGroups>[1],
		direction: Parameters<typeof sortReportGroups>[2],
	) => sortReportGroups(groups, by, direction).map((g) => g.id);

	test("by date, newest or oldest first", () => {
		expect(ids("date", "desc")).toEqual(["a", "c", "b"]);
		expect(ids("date", "asc")).toEqual(["b", "c", "a"]);
	});

	test("by number of reports, newest first on a tie", () => {
		expect(ids("reports", "desc")).toEqual(["c", "b", "a"]);
		expect(ids("reports", "asc")).toEqual(["a", "c", "b"]);
	});

	test("by reports against the member", () => {
		expect(ids("member_reports", "desc")).toEqual(["c", "a", "b"]);
		expect(ids("member_reports", "asc")).toEqual(["b", "a", "c"]);
	});

	test("does not change the input", () => {
		sortReportGroups(groups, "date", "asc");
		expect(groups.map((g) => g.id)).toEqual(["a", "b", "c"]);
	});
});
