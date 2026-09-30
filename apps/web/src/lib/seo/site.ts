import { ENV } from "@/env";

export const SITE_NAME = "Brigada Book Reading Club";
export const SITE_SHORT_NAME = "BBRC";

export const DEFAULT_DESCRIPTION =
	"Brigada Book Reading Club (BBRC) is a parallel book reading club for members of Brigada.";

const DEV_ORIGIN = "http://localhost:3001";

/** Base URL for canonical links, Open Graph, and JSON-LD. */
export function getMetadataBase(): URL {
	const authUrl = ENV.BETTER_AUTH_URL?.trim();
	if (authUrl) {
		return new URL(authUrl.endsWith("/") ? authUrl : `${authUrl}/`);
	}

	if (process.env.VERCEL_URL) {
		return new URL(`https://${process.env.VERCEL_URL}/`);
	}

	return new URL(`${DEV_ORIGIN}/`);
}

export function absoluteUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return new URL(normalized, getMetadataBase()).href;
}
