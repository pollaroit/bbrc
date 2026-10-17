import type { GetAuthorPageOutput } from "@bbrc/api/modules/author/author.schema";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export function authorPageDescription(
	author: Pick<GetAuthorPageOutput, "name" | "bookCount">,
): string {
	const catalogLabel =
		author.bookCount === 1 ? "1 book" : `${author.bookCount} books`;

	return `Explore ${catalogLabel} by ${author.name} in the BBRC catalog. Club reads, reviews, and similar authors.`;
}

export function buildAuthorPageMetadata(author: GetAuthorPageOutput): Metadata {
	return buildPageMetadata({
		title: author.name,
		description: authorPageDescription(author),
		path: `/authors/${author.slug}`,
		openGraph: { type: "website" },
	});
}
