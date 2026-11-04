import { describe, expect, it } from "bun:test";
import { isValidNewPassword, newPasswordIssues } from "./password";

describe("new password rules", () => {
	it("accepts a password with every required class", () => {
		expect(isValidNewPassword("Abcd12!")).toBe(true);
		expect(newPasswordIssues("Good#Pass1")).toEqual([]);
	});

	it("keeps the minimum length at 7", () => {
		expect(isValidNewPassword("Ab1!xxx")).toBe(true);
		expect(newPasswordIssues("Ab1!xx")).toContain(
			"Password must be at least 7 characters long",
		);
	});

	it("requires upper, lower, digit and an allowed special", () => {
		expect(newPasswordIssues("abcd12!")).toContain("Add an uppercase letter");
		expect(newPasswordIssues("ABCD12!")).toContain("Add a lowercase letter");
		expect(newPasswordIssues("Abcdef!")).toContain("Add a digit");
		expect(newPasswordIssues("Abcd123")).toContain(
			"Add one of _$%#@!^&*()-[]{}",
		);
	});

	it("rejects a special that is not in the allowed set", () => {
		expect(isValidNewPassword("Abcd12+")).toBe(false);
	});
});
