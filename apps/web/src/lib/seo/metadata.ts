import {
	buildPageLanguageUrls,
	DEFAULT_LOCALE,
	LOCALE_OG_TAGS,
	LOCALES,
	type Locale,
} from "@bbrc/i18n";
import type { Metadata } from "next";
import { openGraphImageForPath } from "./og/url";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "./site";

const MAX_DESCRIPTION_LENGTH = 160;

/** Settings, admin, edit, and other non-public routes. */
export const NO_INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
	index: false,
	follow: false,
};

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
	/** Override robots; admin and other private routes should pass noindex explicitly. */
	robots?: Metadata["robots"];
	/** The language of the page (the `[locale]` param); English when left out. */
	locale?: Locale;
	/**
	 * The page's main content is written by members (post, comment, review, shelf, profile), so
	 * the other languages look the same: they point at the English page and are not alternates.
	 */
	memberContent?: boolean;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
	const description = truncateDescription(
		input.description?.trim() || DEFAULT_DESCRIPTION,
	);
	const title = input.title.trim();
	const locale = input.locale ?? DEFAULT_LOCALE;
	const urls = input.path
		? buildPageLanguageUrls(input.path, locale, {
				memberContent: input.memberContent,
			})
		: undefined;
	const ogImages =
		input.openGraph?.images ??
		(input.path
			? [openGraphImageForPath(input.path, title, locale)]
			: undefined);
	const ogImageUrl = ogImages
		? Array.isArray(ogImages)
			? ogImages[0]?.url
			: ogImages.url
		: undefined;

	return {
		title,
		description,
		...(urls
			? {
					alternates: {
						canonical: urls.canonical,
						...(urls.languages ? { languages: urls.languages } : {}),
					},
				}
			: {}),
		openGraph: {
			title,
			description,
			siteName: SITE_NAME,
			type: input.openGraph?.type ?? "website",
			locale: LOCALE_OG_TAGS[locale],
			alternateLocale: LOCALES.filter((code) => code !== locale).map(
				(code) => LOCALE_OG_TAGS[code],
			),
			...(urls ? { url: urls.canonical } : {}),
			...(ogImages ? { images: ogImages } : {}),
		},
		twitter: {
			card: ogImages ? "summary_large_image" : "summary",
			title,
			description,
			...(ogImageUrl ? { images: [ogImageUrl] } : {}),
		},
		robots: input.robots ?? { index: true, follow: true },
	};
}

export function buildNotFoundMetadata(entityLabel: string): Metadata {
	return buildPageMetadata({
		title: `${entityLabel} not found`,
		description: `This ${entityLabel.toLowerCase()} could not be found on BBRC.`,
	});
}
