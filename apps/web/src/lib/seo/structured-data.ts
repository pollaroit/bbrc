import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type {
	EditionCore,
	EditionPage,
} from "@bbrc/api/modules/edition/edition.schema";
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
	const rawCover = bookCoverUrl(book.coverId, "L");
	// Uploaded covers are served from this site, so they need the full address.
	const cover = rawCover?.startsWith("/") ? absoluteUrl(rawCover) : rawCover;

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

function schemaBookFormat(format: string | null): string | undefined {
	const value = format?.toLowerCase() ?? "";
	if (!value) return undefined;
	if (value.includes("hard")) return "https://schema.org/Hardcover";
	if (value.includes("paper") || value.includes("softcover")) {
		return "https://schema.org/Paperback";
	}
	if (
		value.includes("e-book") ||
		value.includes("ebook") ||
		value.includes("kindle")
	) {
		return "https://schema.org/EBook";
	}
	if (value.includes("audio")) return "https://schema.org/AudiobookFormat";
	return undefined;
}

/** One edition of a book (its own page), pointing back at the work. */
export function editionJsonLd(input: {
	book: EditionPage["book"];
	edition: EditionCore;
	path: string;
}): JsonLd {
	const { book, edition } = input;
	const cover = edition.covers[0];
	const rawImage = cover?.url
		? cover.url
		: cover?.coverId != null
			? `https://covers.openlibrary.org/b/id/${cover.coverId}-L.jpg`
			: null;
	const image = rawImage?.startsWith("/") ? absoluteUrl(rawImage) : rawImage;
	const format = schemaBookFormat(edition.format);

	return {
		"@context": "https://schema.org",
		"@type": "Book",
		name: edition.title?.trim() || book.title,
		url: absoluteUrl(input.path),
		author: book.authors.map((name) => ({ "@type": "Person", name })),
		exampleOfWork: {
			"@type": "Book",
			name: book.title,
			url: absoluteUrl(`/books/${book.slug}`),
		},
		...(edition.editionName ? { bookEdition: edition.editionName } : {}),
		...(format ? { bookFormat: format } : {}),
		...(edition.isbn13 || edition.isbn10
			? { isbn: edition.isbn13 ?? edition.isbn10 }
			: {}),
		...(edition.languageCode ? { inLanguage: edition.languageCode } : {}),
		...(edition.pages ? { numberOfPages: edition.pages } : {}),
		...(edition.publishers[0]
			? { publisher: { "@type": "Organization", name: edition.publishers[0] } }
			: {}),
		...(edition.publishedYear
			? { datePublished: String(edition.publishedYear) }
			: {}),
		...(edition.translator
			? { translator: { "@type": "Person", name: edition.translator } }
			: {}),
		...(edition.description ? { description: edition.description } : {}),
		...(image ? { image } : {}),
	};
}

export function breadcrumbJsonLd(
	items: { name: string; path: string }[],
): JsonLd {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: absoluteUrl(item.path),
		})),
	};
}
