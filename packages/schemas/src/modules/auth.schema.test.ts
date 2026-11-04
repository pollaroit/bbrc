import { describe, expect, it } from "bun:test";
import { RESERVED_USERNAME_MESSAGE } from "@bbrc/shared";
import {
	passwordSchema,
	SignInInputSchema,
	SignupInputSchema,
	usernameInputSchema,
} from "./auth.schema";

describe("passwordSchema", () => {
	it("accepts a new password that meets every rule", () => {
		expect(passwordSchema.safeParse("Abcd12!").success).toBe(true);
	});

	it("rejects missing classes", () => {
		expect(passwordSchema.safeParse("abcd12!").success).toBe(false);
		expect(passwordSchema.safeParse("Abcd123").success).toBe(false);
	});
});

describe("usernameInputSchema", () => {
	it("rejects a reserved username", () => {
		const parsed = usernameInputSchema.safeParse("admin");
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.issues[0]?.message).toBe(RESERVED_USERNAME_MESSAGE);
		}
	});

	it("still accepts a normal username", () => {
		expect(usernameInputSchema.safeParse("mehdi").success).toBe(true);
	});
});

describe("SignupInputSchema", () => {
	it("rejects a reserved username on sign-up", () => {
		const parsed = SignupInputSchema.safeParse({
			name: "Ada",
			username: "root",
			email: "ada@example.com",
			password: "Abcd12!",
		});
		expect(parsed.success).toBe(false);
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
