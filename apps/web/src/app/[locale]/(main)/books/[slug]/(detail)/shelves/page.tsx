import type { Metadata } from "next";
import { BookShelvesSection } from "@/components/blocks/book-shelves-section";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
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
			title: "Shelves",
			description: `Member shelves that include ${book.title}.`,
			segment: "shelves",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookShelvesPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	await loadBookBySlugForIsr(slug);

	return <BookShelvesSection bookSlug={slug} />;
}
