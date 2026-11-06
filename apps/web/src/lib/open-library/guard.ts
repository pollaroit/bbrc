import { assertRateLimit } from "@/lib/rate-limit";
import { cacheGet, cacheSet } from "@/lib/redis";

const CACHE_TTL_SECONDS = 60;

export async function withOpenLibraryGuard(
	request: Request,
	cacheKey: string | null,
	run: () => Promise<Response>,
): Promise<Response> {
	const limited = await assertRateLimit(request, "open-library", 120, "1 m");
	if (limited) return limited;

	if (cacheKey) {
		const cached = await cacheGet<unknown>(cacheKey);
		if (cached != null) {
			return Response.json(cached);
		}
	}

	const response = await run();
	if (cacheKey && response.ok) {
		try {
			const body: unknown = await response.clone().json();
			await cacheSet(cacheKey, body, CACHE_TTL_SECONDS);
		} catch {
			// Leave uncached if the body is not JSON.
		}
	}
	return response;
}
