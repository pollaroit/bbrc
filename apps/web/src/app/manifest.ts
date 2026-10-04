import type { MetadataRoute } from "next";

import {
	DEFAULT_DESCRIPTION,
	SITE_NAME,
	SITE_SHORT_NAME,
} from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: SITE_NAME,
		short_name: SITE_SHORT_NAME,
		description: DEFAULT_DESCRIPTION,
		start_url: "/",
		id: "/",
		display: "standalone",
		orientation: "portrait",
		background_color: "#ffffff",
		theme_color: "#ffffff",
		icons: [
			{
				src: "/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
