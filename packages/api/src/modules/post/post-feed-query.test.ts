import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { postVisibilitySql } from "./post-feed-query";

describe("postVisibilitySql", () => {
	test("visitors see public profiles only", () => {
		expect(postVisibilitySql(ANONYMOUS_VIEWER).sql).toContain(
			"profile_visibility = 'public'",
		);
	});
	test("admins see everything", () => {
		expect(
			postVisibilitySql(memberViewer({ userId: "a", isAdmin: true })).sql,
		).toBe("TRUE");
	});
	test("members get their id, friends and blocked ids as parameters", () => {
		const sql = postVisibilitySql(
			memberViewer({
				userId: "me",
				isAdmin: false,
				friendIds: ["f1", "f2"],
				blockedIds: ["b1"],
			}),
		);
		expect(sql.values).toEqual(["me", "b1", "f1", "f2"]);
		expect(sql.sql).toContain("NOT IN");
	});
	test("no friends and no blocks still produce valid SQL", () => {
		const sql = postVisibilitySql(
			memberViewer({ userId: "me", isAdmin: false }),
		);
		expect(sql.values).toEqual(["me"]);
		expect(sql.sql).toContain("FALSE");
	});
});
