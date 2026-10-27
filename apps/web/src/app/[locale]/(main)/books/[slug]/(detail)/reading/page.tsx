import type { Metadata } from "next";
import { BookReadersPanel } from "@/components/blocks/reading/book-readers-panel";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

/** Who is reading changes all the time; the panel loads it in the browser. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "Reading now",
			description: `Members who are reading ${book.title} right now.`,
			segment: "reading",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookReadingPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	const book = await loadBookBySlugForIsr(slug);

	return (
		<BookReadersPanel
			bookSlug={slug}
			bookTitle={book.title}
			bookPages={book.pages ?? 0}
		/>
	);
}
