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

/**
 * Who is asking, for rate limits. Vercel's own header comes first because it is set by the
 * platform and cannot be forged by the client; then the usual proxy headers. Returns null
 * when nobody can be told apart (local development, an odd proxy chain): a limit must then
 * be skipped, never shared, or every member would draw on one common allowance.
 */
export function clientIp(request: Request): string | null {
	for (const name of ["x-vercel-forwarded-for", "x-real-ip"]) {
		const value = request.headers.get(name)?.trim();
		if (value) return value;
	}
	const forwarded = request.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	return forwarded || null;
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
	const ip = clientIp(request);
	if (!ip) return null;
	const { success } = await instance.limit(ip);
	if (success) return null;
	return Response.json(
		{ error: "Too many requests. Try again shortly." },
		{
			status: 429,
		},
	);
}
