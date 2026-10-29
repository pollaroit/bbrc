export function resolvePublicAppOrigin(): string {
	const authUrl = process.env.BETTER_AUTH_URL?.trim();
	if (authUrl) {
		return authUrl.replace(/\/$/, "");
	}
	const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
	if (vercel) {
		return vercel.startsWith("http")
			? vercel.replace(/\/$/, "")
			: `https://${vercel}`;
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
	}
	return "http://localhost:3001";
}
