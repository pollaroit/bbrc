import { ENV } from "@/env";

export const SITE_NAME = "Brigada Book Reading Club";
export const SITE_SHORT_NAME = "BBRC";

export const DEFAULT_DESCRIPTION =
	"Brigada Book Reading Club (BBRC) is a parallel book reading club for members of Brigada.";

const DEV_ORIGIN = "http://localhost:3001";

function normalizeOrigin(url: string): URL {
	const trimmed = url.trim();
	const withProtocol = trimmed.startsWith("http")
		? trimmed
		: `https://${trimmed}`;
	return new URL(
		withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`,
	);
}

/** Prefer Vercel-provided URLs so production builds avoid inlining other env in static HTML. */
function vercelDeploymentOrigin(): URL | undefined {
	const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
	if (production) {
		return normalizeOrigin(production);
	}

	const deployment = process.env.VERCEL_URL?.trim();
	if (deployment) {
		return normalizeOrigin(deployment);
	}

	return undefined;
}

/** Base URL for canonical links, Open Graph, and JSON-LD. */
export function getMetadataBase(): URL {
	const vercelOrigin = vercelDeploymentOrigin();
	if (vercelOrigin) {
		return vercelOrigin;
	}

	const authUrl = ENV.BETTER_AUTH_URL?.trim();
	if (authUrl) {
		return normalizeOrigin(authUrl);
	}

	return new URL(`${DEV_ORIGIN}/`);
}

export function absoluteUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return new URL(normalized, getMetadataBase()).href;
}
