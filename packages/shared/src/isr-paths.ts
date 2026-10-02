/** App Router paths for ISR-backed detail pages (no trailing slashes). */
export function bookDetailIsrPath(slug: string) {
	return `/books/${slug}`;
}

export function sittingDetailIsrPath(slug: string) {
	return `/sittings/${slug}`;
}

export function sittingVoteIsrPath(slug: string) {
	return `/sittings/${slug}/vote`;
}

export function postDetailIsrPath(slug: string) {
	return `/posts/${slug}`;
}

export function userProfileIsrPath(username: string) {
	return `/users/${username}`;
}
