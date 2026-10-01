import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	outputFileTracingIncludes: {
		"/og/[[...path]]": ["./src/lib/seo/og/fonts/**/*"],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "covers.openlibrary.org",
				pathname: "/b/id/**",
			},
		],
	},
};

export default withVarlock(nextConfig);
