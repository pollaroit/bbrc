const RETRY_DELAYS_MS = [400, 1200, 2500];

/**
 * A 429 means the request was turned away before it ran (by the platform in front of the
 * app, not by our code, which only limits sign in and password reset), so asking again is
 * safe for any call. Retrying quietly keeps a busy moment from rolling back a page number
 * or blocking "finish". What answered is logged, so the sender can be found.
 */
export async function fetchWithRetryOn429(
	makeRequest: () => Promise<Response>,
): Promise<Response> {
	let response = await makeRequest();
	for (const delay of RETRY_DELAYS_MS) {
		if (response.status !== 429) return response;
		if (typeof window !== "undefined") {
			const body = await response
				.clone()
				.text()
				.catch(() => "");
			console.warn("[rpc] 429, retrying", {
				url: response.url,
				server: response.headers.get("server"),
				vercelId: response.headers.get("x-vercel-id"),
				mitigated: response.headers.get("x-vercel-mitigated"),
				retryAfter: response.headers.get("retry-after"),
				body: body.slice(0, 200),
			});
		}
		const retryAfter = Number(response.headers.get("retry-after"));
		const wait =
			Number.isFinite(retryAfter) && retryAfter > 0
				? Math.min(retryAfter * 1000, 4000)
				: delay;
		await new Promise((resolve) => setTimeout(resolve, wait));
		response = await makeRequest();
	}
	return response;
}
