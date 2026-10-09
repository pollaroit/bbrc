import type { Metadata } from "next";
import { formatBookAuthors } from "@/lib/book-cover";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

type BookMetaSource = {
	slug: string;
	title: string;
	authors: string[];
	excerpt?: string | null;
};

export function buildBookTabMetadata(
	book: BookMetaSource,
	tab: {
		title: string;
		description: string;
		segment: string;
	},
): Metadata {
	const path =
		tab.segment.length > 0
			? `/books/${book.slug}/${tab.segment}`
			: `/books/${book.slug}`;

	return buildPageMetadata({
		title: `${book.title} · ${tab.title}`,
		description: tab.description,
		path,
		openGraph: { type: "website" },
	});
}

export function bookOverviewDescription(book: BookMetaSource): string {
	return (
		book.excerpt?.trim() ||
		`${book.title} by ${formatBookAuthors(book.authors)} in the BBRC library.`
	);
}

export { buildNotFoundMetadata };
