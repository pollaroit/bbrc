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

function r2CspHost(): string | undefined {
	const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
	if (!raw) return undefined;
	try {
		const url = new URL(raw);
		return url.protocol === "https:" ? url.host : undefined;
	} catch {
		return undefined;
	}
}

function contentSecurityPolicy(): string {
	const r2Host = r2CspHost();
	const development = process.env.NODE_ENV !== "production";
	const imgSrc = [
		"'self'",
		"data:",
		"blob:",
		"https://covers.openlibrary.org",
		"https://i.ytimg.com",
		"https://img.youtube.com",
		// Country flags (react-circle-flags default CDN).
		"https://react-circle-flags.pages.dev",
		// mapcn / MapLibre sprites (PNG) from CARTO.
		"https://basemaps.cartocdn.com",
		"https://*.basemaps.cartocdn.com",
		...(r2Host ? [`https://${r2Host}`] : []),
	];
	const ablyConnect = [
		"https://*.ably.io",
		"wss://*.ably.io",
		"https://*.ably.net",
		"wss://*.ably.net",
		"https://*.ably-realtime.com",
		"wss://*.ably-realtime.com",
		"https://internet-up.ably-realtime.com",
	];
	const scriptSrc = [
		"'self'",
		"'unsafe-inline'",
		...(development ? ["'unsafe-eval'"] : []),
		"https://va.vercel-scripts.com",
		"https://www.youtube.com",
		"https://www.youtube-nocookie.com",
		// Ably connectivity check (JSONP fallback in some browsers).
		"https://internet-up.ably-realtime.com",
		// Cloudflare Web Analytics when injected from the Cloudflare dashboard.
		"https://static.cloudflareinsights.com",
		// MapLibre's worker is a script loaded from unpkg (see `worker-src` and `connect-src`).
		"https://unpkg.com",
	];
	const connectSrc = [
		"'self'",
		...ablyConnect,
		"https://va.vercel-scripts.com",
		"https://vitals.vercel-insights.com",
		"https://openlibrary.org",
		"https://www.youtube.com",
		"https://www.youtube-nocookie.com",
		// mapcn: style JSON, vector tiles, glyphs.
		"https://basemaps.cartocdn.com",
		"https://*.basemaps.cartocdn.com",
		// MapLibre worker is fetched from unpkg when the bundled worker URL is unset.
		"https://unpkg.com",
		...(development
			? ["ws:", "wss:", "http://127.0.0.1:*", "http://localhost:*"]
			: []),
	];
	const directives = [
		"default-src 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		`script-src ${scriptSrc.join(" ")}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src ${imgSrc.join(" ")}`,
		"font-src 'self' data:",
		"frame-src https://www.youtube-nocookie.com https://www.youtube.com",
		`connect-src ${connectSrc.join(" ")}`,
		// blob: for MapLibre's in-page worker; unpkg hosts maplibre-gl-worker.mjs.
		"worker-src 'self' blob: https://unpkg.com",
		"manifest-src 'self'",
	];
	return directives.join("; ");
}

function securityHeaders(): { key: string; value: string }[] {
	const headers = [
		{ key: "X-Content-Type-Options", value: "nosniff" },
		{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
		{ key: "X-Frame-Options", value: "DENY" },
		{
			key: "Permissions-Policy",
			value: "camera=(), microphone=(), geolocation=(), payment=()",
		},
		{ key: "Content-Security-Policy", value: contentSecurityPolicy() },
	];
	if (process.env.NODE_ENV === "production") {
		headers.push({
			key: "Strict-Transport-Security",
			value: "max-age=31536000; includeSubDomains",
		});
	}
	return headers;
}

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders(),
			},
		];
	},
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
