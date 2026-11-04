import { describe, expect, it } from "bun:test";
import { passwordSchema, SignInInputSchema } from "./auth.schema";

describe("passwordSchema", () => {
	it("accepts a new password that meets every rule", () => {
		expect(passwordSchema.safeParse("Abcd12!").success).toBe(true);
	});

	it("rejects missing classes", () => {
		expect(passwordSchema.safeParse("abcd12!").success).toBe(false);
		expect(passwordSchema.safeParse("Abcd123").success).toBe(false);
	});
});

describe("SignInInputSchema", () => {
	it("still accepts any non-empty password so existing members can sign in", () => {
		expect(
			SignInInputSchema.safeParse({
				email: "member@example.com",
				password: "oldone",
			}).success,
		).toBe(true);
	});
});
