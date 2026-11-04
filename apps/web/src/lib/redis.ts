import { Redis } from "@upstash/redis";
import { ENV } from "@/env.server";

const url = ENV.UPSTASH_REDIS_REST_URL?.trim() ?? "";
const token = ENV.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";

export const redisEnabled = Boolean(url && token);

if (process.env.VERCEL_ENV === "production" && !redisEnabled) {
	throw new Error(
		"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.",
	);
}

export const redis = redisEnabled ? new Redis({ url, token }) : null;

const AUTH_PREFIX = "auth:";
const CACHE_PREFIX = "cache:";

export function createAuthSecondaryStorage() {
	if (!redis) return undefined;

	return {
		async get(key: string) {
			const value = await redis.get<string>(`${AUTH_PREFIX}${key}`);
			return value ?? null;
		},
		async getAndDelete(key: string) {
			const value = await redis.getdel<string>(`${AUTH_PREFIX}${key}`);
			return value ?? null;
		},
		async increment(key: string, ttl: number) {
			const count = await redis.eval(
				"local n = redis.call('INCR', KEYS[1]) if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return n",
				[`${AUTH_PREFIX}${key}`],
				[ttl],
			);
			return Number(count);
		},
		async set(key: string, value: string, ttl?: number) {
			if (ttl && ttl > 0) {
				await redis.set(`${AUTH_PREFIX}${key}`, value, { ex: ttl });
				return;
			}
			await redis.set(`${AUTH_PREFIX}${key}`, value);
		},
		async delete(key: string) {
			await redis.del(`${AUTH_PREFIX}${key}`);
		},
	};
}

export async function cacheGet<T>(key: string): Promise<T | null> {
	if (!redis) return null;
	const value = await redis.get<T>(`${CACHE_PREFIX}${key}`);
	return value ?? null;
}

export async function cacheSet(
	key: string,
	value: unknown,
	ttlSeconds: number,
): Promise<void> {
	if (!redis) return;
	await redis.set(`${CACHE_PREFIX}${key}`, value, { ex: ttlSeconds });
}
