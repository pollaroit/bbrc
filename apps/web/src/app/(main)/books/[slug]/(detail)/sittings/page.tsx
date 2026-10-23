import type { Metadata } from "next";

import { BookSittingsPanel } from "@/components/blocks/book-sittings-panel";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadBookBySlugForIsr, loadBookSittingsForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "Sittings",
			description: `Club sittings that picked ${book.title}, and the polls it was part of.`,
			segment: "sittings",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookSittingsPage({
	params,
}: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const sittings = await loadBookSittingsForIsr(slug);

	return (
		<ListingSearchParamsBoundary>
			<BookSittingsPanel bookSlug={slug} initialData={sittings} />
		</ListingSearchParamsBoundary>
	);
}
