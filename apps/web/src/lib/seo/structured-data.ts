import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { bookCoverUrl } from "@/lib/book-cover";
import { absoluteUrl, SITE_NAME, SITE_SHORT_NAME } from "./site";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: SITE_NAME,
		alternateName: SITE_SHORT_NAME,
		url: absoluteUrl("/"),
	};
}

export function websiteJsonLd(): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		alternateName: SITE_SHORT_NAME,
		url: absoluteUrl("/"),
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
		},
	};
}

export function bookJsonLd(book: TGetBookBySlugOutputSchema): JsonLd {
	const cover = bookCoverUrl(book.coverId, "L");

	return {
		"@context": "https://schema.org",
		"@type": "Book",
		name: book.title,
		url: absoluteUrl(`/books/${book.slug}`),
		author: book.authors.map((name) => ({
			"@type": "Person",
			name,
		})),
		...(book.pages ? { numberOfPages: book.pages } : {}),
		...(book.excerpt ? { description: book.excerpt } : {}),
		...(cover ? { image: cover } : {}),
	};
}

export function authorJsonLd(input: {
	name: string;
	slug: string;
	bookCount: number;
}): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		name: input.name,
		url: absoluteUrl(`/authors/${input.slug}`),
		...(input.bookCount > 0
			? {
					description: `${input.bookCount} ${input.bookCount === 1 ? "work" : "works"} in the BBRC catalog`,
				}
			: {}),
	};
}

export function personJsonLd(input: {
	name: string;
	username: string;
}): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		name: `${input.name} (@${input.username})`,
		url: absoluteUrl(`/users/${input.username}`),
		mainEntity: {
			"@type": "Person",
			name: input.name,
			alternateName: input.username,
			url: absoluteUrl(`/users/${input.username}`),
		},
	};
}

export function blogPostingJsonLd(input: {
	slug: string;
	content: string;
	authorName: string;
	createdAt: Date | string;
}): JsonLd {
	const excerpt = input.content.trim().slice(0, 280);

	return {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: `Post by ${input.authorName}`,
		url: absoluteUrl(`/posts/${input.slug}`),
		datePublished: new Date(input.createdAt).toISOString(),
		author: {
			"@type": "Person",
			name: input.authorName,
		},
		...(excerpt ? { articleBody: excerpt } : {}),
		publisher: {
			"@type": "Organization",
			name: SITE_NAME,
		},
	};
}
