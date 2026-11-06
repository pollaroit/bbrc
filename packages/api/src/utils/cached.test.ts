import { describe, expect, it } from "bun:test";
import type { ApiCache } from "../context";
import { cached } from "./cached";

function memoryCache(options: { failGet?: boolean; failSet?: boolean } = {}) {
	const store = new Map<string, unknown>();
	const ttl: Record<string, number> = {};
	const cache: ApiCache = {
		get: async <T>(key: string) => {
			if (options.failGet) throw new Error("down");
			return (store.get(key) as T | undefined) ?? null;
		},
		set: async (key, value, seconds) => {
			if (options.failSet) throw new Error("down");
			store.set(key, value);
			ttl[key] = seconds;
		},
	};
	return { cache, store, ttl };
}

describe("cached", () => {
	it("works a value out once and then serves it from the cache", async () => {
		const { cache, ttl } = memoryCache();
		let runs = 0;
		const compute = async () => ({ runs: ++runs });
		expect(await cached(cache, "k", 3600, compute)).toEqual({ runs: 1 });
		expect(await cached(cache, "k", 3600, compute)).toEqual({ runs: 1 });
		expect(runs).toBe(1);
		expect(ttl.k).toBe(3600);
	});

	it("keeps different keys apart", async () => {
		const { cache } = memoryCache();
		let runs = 0;
		await cached(cache, "a", 60, async () => ++runs);
		await cached(cache, "b", 60, async () => ++runs);
		expect(runs).toBe(2);
	});

	it("just computes when there is no cache", async () => {
		let runs = 0;
		await cached(undefined, "k", 60, async () => ++runs);
		await cached(undefined, "k", 60, async () => ++runs);
		expect(runs).toBe(2);
	});

	it("never fails the request because the cache did", async () => {
		const down = memoryCache({ failGet: true, failSet: true });
		expect(await cached(down.cache, "k", 60, async () => 7)).toBe(7);
	});
});
