import { describe, expect, it } from "bun:test";
import { fetchWithRetryOn429 } from "./retry-429";

describe("fetchWithRetryOn429", () => {
	it("asks again after a 429 and returns the answer that follows", async () => {
		let calls = 0;
		const response = await fetchWithRetryOn429(async () => {
			calls++;
			return calls < 3
				? new Response("slow down", {
						status: 429,
						headers: { "retry-after": "0" },
					})
				: new Response("ok", { status: 200 });
		});
		expect(response.status).toBe(200);
		expect(calls).toBe(3);
	});

	it("does not retry other statuses", async () => {
		let calls = 0;
		const response = await fetchWithRetryOn429(async () => {
			calls++;
			return new Response("nope", { status: 500 });
		});
		expect(response.status).toBe(500);
		expect(calls).toBe(1);
	});

	it("gives up after a few tries and returns the 429", async () => {
		let calls = 0;
		const response = await fetchWithRetryOn429(async () => {
			calls++;
			return new Response("busy", {
				status: 429,
				headers: { "retry-after": "0" },
			});
		});
		expect(response.status).toBe(429);
		expect(calls).toBe(4);
	});
});
