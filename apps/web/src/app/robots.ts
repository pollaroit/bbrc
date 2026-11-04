import { ROBOTS_ALLOWED_USER_AGENTS } from "@bbrc/shared";
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const privatePaths = ["/admin", "/settings", "/*/edit"];

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				disallow: "/",
			},
			...ROBOTS_ALLOWED_USER_AGENTS.map((userAgent) => ({
				userAgent,
				allow: "/",
				disallow: privatePaths,
			})),
		],
		sitemap: absoluteUrl("/sitemap.xml"),
	};
}
