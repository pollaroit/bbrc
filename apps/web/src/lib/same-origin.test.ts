import { describe, expect, it } from "bun:test";
import { isSameOriginRequest } from "./same-origin";

describe("isSameOriginRequest", () => {
	it("allows a missing Origin", () => {
		const request = new Request("https://bbrc.app/api/views", {
			method: "POST",
		});
		expect(isSameOriginRequest(request)).toBe(true);
	});

	it("allows the same host", () => {
		const request = new Request("https://bbrc.app/api/views", {
			method: "POST",
			headers: { origin: "https://bbrc.app" },
		});
		expect(isSameOriginRequest(request)).toBe(true);
	});

	it("rejects a different host", () => {
		const request = new Request("https://bbrc.app/api/views", {
			method: "POST",
			headers: { origin: "https://evil.example" },
		});
		expect(isSameOriginRequest(request)).toBe(false);
	});
});
