import { absoluteUrl } from "../site";
import { ogPathFromPagePath } from "./paths";

export function openGraphImageForPath(
	pagePath: string,
	alt?: string,
): { url: string; width: number; height: number; alt: string } {
	const ogPath = ogPathFromPagePath(pagePath);
	return {
		url: absoluteUrl(ogPath),
		width: 1200,
		height: 630,
		alt: alt?.trim() || "BBRC preview",
	};
}
