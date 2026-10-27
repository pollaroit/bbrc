import { withSerwist } from "@serwist/turbopack";
import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withVarlock = varlockNextConfigPlugin();
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
		return [
			{
				source: "/leaderboard/all",
				destination: "/leaderboard/overview/all",
				permanent: true,
			},
			{
				source: "/leaderboard/year",
				destination: "/leaderboard/overview/year",
				permanent: true,
			},
			{
				source: "/leaderboard/week",
				destination: "/leaderboard/overview/week",
				permanent: true,
			},
		];
	},
	async rewrites() {
		return [
			{ source: "/feed/posts.xml", destination: "/feed/posts" },
			{ source: "/feed/books.xml", destination: "/feed/books" },
			// The author pages are cached for everyone and hide authors without books; the edit
			// screen lives in the admin area (so a brand-new author can be edited) at this address.
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
