import { withSerwist } from "@serwist/turbopack";
import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

import type { NextConfig } from "next";

const withVarlock = varlockNextConfigPlugin();

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
	typedRoutes: true,
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
			// The Account connections page only held the Telegram link, which is gone.
			{
				source: "/settings/accounts",
				destination: "/settings",
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

export default withVarlock(withSerwist(nextConfig));
