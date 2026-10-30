import { describe, expect, test } from "bun:test";
import { markReadParticipationWhere } from "./read.service";

describe("markReadParticipationWhere", () => {
	const where = markReadParticipationWhere("user-1", "book-1");

	test("only the member's own, active participations of that book", () => {
		expect(where.userId).toBe("user-1");
		expect(where.removedAt).toBeNull();
		expect(where.sitting.selectedBookId).toBe("book-1");
	});

	test("only a sitting that is going is synced, never a finished one", () => {
		expect(where.sitting.status).toBe("reading");
	});

	test("a DNF or a completion is never changed", () => {
		expect(where.progress.notIn).toContain("dnf");
		expect(where.progress.notIn).toContain("completed");
		expect(where.progress.notIn).not.toContain("in_progress");
		expect(where.progress.notIn).not.toContain("not_started");
	});
});
