import { describe, expect, test } from "bun:test";
import { realtimeClientId } from "./client-id";

describe("realtimeClientId", () => {
	const secret = "test-secret-with-enough-length-0123456789";

	test("the same member always gets the same id", () => {
		expect(realtimeClientId("user-1", secret)).toBe(
			realtimeClientId("user-1", secret),
		);
	});

	test("different members get different ids", () => {
		const ids = new Set(
			Array.from({ length: 500 }, (_, index) =>
				realtimeClientId(`user-${index}`, secret),
			),
		);
		expect(ids.size).toBe(500);
	});

	test("the id does not contain or reveal the user id", () => {
		const id = realtimeClientId("3f2a9c1e-user-id", secret) ?? "";
		expect(id).not.toContain("3f2a9c1e");
		expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
	});

	test("another secret gives other ids", () => {
		expect(realtimeClientId("user-1", secret)).not.toBe(
			realtimeClientId("user-1", `${secret}-changed`),
		);
	});

	test("without a secret there is no id", () => {
		expect(realtimeClientId("user-1", "")).toBeNull();
		expect(realtimeClientId("user-1", undefined)).toBeNull();
	});
});
