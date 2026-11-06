import type { ApiCache } from "../context";

/**
 * Returns the cached value for `key`, or works it out, keeps it for `ttlSeconds` and
 * returns it. With no cache (local development, Redis not set up) it just works it out.
 * A cache that fails never fails the request: the value is worked out instead.
 */
export async function cached<T>(
	cache: ApiCache | undefined,
	key: string,
	ttlSeconds: number,
	compute: () => Promise<T>,
): Promise<T> {
	if (cache) {
		try {
			const hit = await cache.get<T>(key);
			if (hit != null) return hit;
		} catch (error) {
			console.error(`cache read for ${key} failed`, error);
		}
	}
	const value = await compute();
	if (cache) {
		try {
			await cache.set(key, value, ttlSeconds);
		} catch (error) {
			console.error(`cache write for ${key} failed`, error);
		}
	}
	return value;
}
