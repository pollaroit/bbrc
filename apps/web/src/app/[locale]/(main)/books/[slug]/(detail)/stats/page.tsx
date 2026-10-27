import type { Metadata } from "next";

import { BookStatsPanel } from "@/components/blocks/book-stats-panel";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadBookBySlugForIsr, loadBookStatsForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "Stats",
			description: `Readers, ratings, poll results and quiz scores for ${book.title}.`,
			segment: "stats",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookStatsPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	const stats = await loadBookStatsForIsr(slug);

	return (
		<ListingSearchParamsBoundary>
			<BookStatsPanel bookSlug={slug} initialData={stats} />
		</ListingSearchParamsBoundary>
	);
}
