import { Ratelimit } from "@upstash/ratelimit";
import { redis, redisEnabled } from "./redis";

const limiters = new Map<string, Ratelimit>();

function limiter(
	name: string,
	limit: number,
	window: `${number} ${"s" | "m" | "h"}`,
) {
	const existing = limiters.get(name);
	if (existing) return existing;
	if (!redis) return null;
	const created = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(limit, window),
		prefix: `rl:${name}`,
		analytics: false,
	});
	limiters.set(name, created);
	return created;
}

export function clientIp(request: Request): string {
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function assertRateLimit(
	request: Request,
	name: string,
	limit: number,
	window: `${number} ${"s" | "m" | "h"}`,
): Promise<Response | null> {
	if (!redisEnabled) return null;
	const instance = limiter(name, limit, window);
	if (!instance) return null;
	const { success } = await instance.limit(clientIp(request));
	if (success) return null;
	return Response.json(
		{ error: "Too many requests. Try again shortly." },
		{
			status: 429,
		},
	);
}
