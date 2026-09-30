/** Fixed app routes included in the sitemap and safe to prerender as static shells. */
export const STATIC_APP_ROUTES = [
	{ path: "/", changeFrequency: "daily" as const, priority: 1 },
	{ path: "/books", changeFrequency: "daily" as const, priority: 0.9 },
	{ path: "/sittings", changeFrequency: "daily" as const, priority: 0.9 },
	{ path: "/users", changeFrequency: "weekly" as const, priority: 0.8 },
] as const;

/** Default ISR revalidation for DB-backed detail pages (seconds). Use literal `3600` in `export const revalidate`. */
export const DETAIL_PAGE_REVALIDATE_SECONDS = 3600;
