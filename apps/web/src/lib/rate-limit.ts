/**
 * Who is asking. Vercel's own header comes first because it is set by the platform and
 * cannot be forged by the client; then the usual proxy headers. Returns null when nobody can
 * be told apart (local development, an odd proxy chain).
 *
 * There are no request limits on what a signed-in member does: only sign in, register and
 * password reset are limited, by the sign-in library (see `packages/auth`).
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
