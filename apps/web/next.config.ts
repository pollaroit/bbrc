import { DEFAULT_LOCALE, LOCALES } from "@bbrc/i18n/locales";
import { withSerwist } from "@serwist/turbopack";
import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withVarlock = varlockNextConfigPlugin();

const NON_DEFAULT_LOCALES = LOCALES.filter(
	(locale) => locale !== DEFAULT_LOCALE,
);
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function r2ImageRemotePattern():
	| { protocol: "https"; hostname: string; pathname: string }
	| undefined {
	const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
	if (!raw) {
		return undefined;
	}
	try {
		const url = new URL(raw);
		if (url.protocol !== "https:") {
			return undefined;
		}
		return {
			protocol: "https",
			hostname: url.hostname,
			pathname: "/**",
		};
	} catch {
		return undefined;
	}
}

const r2Pattern = r2ImageRemotePattern();

const nextConfig: NextConfig = {
	// Off: every page now lives under `[locale]`, so Next's typed routes no longer match plain
	// addresses like "/books". Links go through next-intl's navigation, which adds the language.
	typedRoutes: false,
	reactCompiler: true,
	async redirects() {
		// Redirects run before the language middleware, so each one has a variant per language.
		return ["", ...NON_DEFAULT_LOCALES.map((locale) => `/${locale}`)].flatMap(
			(prefix) =>
				(["all", "year", "week"] as const).map((period) => ({
					source: `${prefix}/leaderboard/${period}`,
					destination: `${prefix}/leaderboard/overview/${period}`,
					permanent: true,
				})),
		);
	},
	async rewrites() {
		return [
			// Feeds sit outside the language segment (English only).
			{ source: "/feed/posts.xml", destination: "/feed/posts" },
			{ source: "/feed/books.xml", destination: "/feed/books" },
			// The author pages are cached for everyone and hide authors without books; the edit
			// screen lives in the admin area (so a brand-new author can be edited) at this address.
			// Rewrites run after the language middleware, which has already put the language in
			// the path (`/en/...` for English), so the source matches that form; the plain and the
			// `/az` forms are kept for requests that skip the middleware.
			{
				source: "/:locale(en|az)/authors/:slug/edit",
				destination: "/:locale/admin/authors/edit/:slug",
			},
			{
				source: "/authors/:slug/edit",
				destination: "/admin/authors/edit/:slug",
			},
		];
	},
	outputFileTracingIncludes: {
		"/og/[[...path]]": ["./src/lib/seo/og/fonts/**/*"],
	},
	images: {
		// Serve R2 / Open Library URLs directly — avoids Vercel Image Optimization quotas.
		unoptimized: true,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "covers.openlibrary.org",
				pathname: "/b/id/**",
			},
			...(r2Pattern ? [r2Pattern] : []),
		],
	},
};

export default withVarlock(withSerwist(withNextIntl(nextConfig)));
