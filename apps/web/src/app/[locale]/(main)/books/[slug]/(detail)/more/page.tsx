import type { Metadata } from "next";
import { BookDiscoveryLists } from "@/components/blocks/book-discovery-section";
import { formatBookAuthors } from "@/lib/book-cover";
import {
	loadBookBySlugForIsr,
	loadBookCatalogDiscoveryForIsr,
} from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]/more">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "More to read",
			description: `Books like ${book.title} by ${formatBookAuthors(book.authors)} — same author, country, era, and length in the BBRC catalog.`,
			segment: "more",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookMorePage({
	params,
}: PageProps<"/[locale]/books/[slug]/more">) {
	const { slug } = await params;
	const discovery = await loadBookCatalogDiscoveryForIsr(slug);

	return <BookDiscoveryLists discovery={discovery} />;
}
