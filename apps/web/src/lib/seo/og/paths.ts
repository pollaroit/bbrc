/** Maps a public page path to the matching OG image route (client-safe). */
export function ogPathFromPagePath(pagePath: string): string {
	const normalized = pagePath.replace(/^\//, "").replace(/\/$/, "");
	if (!normalized) {
		return "/og";
	}
	return `/og/${normalized}`;
}
