import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "./site";

const MAX_DESCRIPTION_LENGTH = 160;

export function truncateDescription(text: string): string {
	const trimmed = text.trim().replace(/\s+/g, " ");
	if (trimmed.length <= MAX_DESCRIPTION_LENGTH) {
		return trimmed;
	}

	return `${trimmed.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

type PageOpenGraph = {
	type?: "website" | "article" | "profile" | "book";
	images?: { url: string; alt?: string } | { url: string; alt?: string }[];
};

export type BuildPageMetadataInput = {
	title: string;
	description?: string;
	/** Site-relative path for canonical URL, e.g. `/books/my-slug`. */
	path?: string;
	openGraph?: PageOpenGraph;
	/** Defaults to noindex for this private club app (OG previews still work). */
	robots?: Metadata["robots"];
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
	const description = truncateDescription(
		input.description?.trim() || DEFAULT_DESCRIPTION,
	);
	const title = input.title.trim();

	return {
		title,
		description,
		...(input.path ? { alternates: { canonical: input.path } } : {}),
		openGraph: {
			title,
			description,
			siteName: SITE_NAME,
			type: input.openGraph?.type ?? "website",
			...(input.path ? { url: input.path } : {}),
			...(input.openGraph?.images ? { images: input.openGraph.images } : {}),
		},
		twitter: {
			card: input.openGraph?.images ? "summary_large_image" : "summary",
			title,
			description,
		},
		robots: input.robots ?? { index: false, follow: false },
	};
}

export function buildNotFoundMetadata(entityLabel: string): Metadata {
	return buildPageMetadata({
		title: `${entityLabel} not found`,
		description: `This ${entityLabel.toLowerCase()} could not be found on BBRC.`,
	});
}
