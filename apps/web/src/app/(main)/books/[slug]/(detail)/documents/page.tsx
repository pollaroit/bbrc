import type { Metadata } from "next";
import { BookDocumentsSection } from "@/components/blocks/book-documents-section";
import {
	loadApprovedDocumentsForIsr,
	loadBookBySlugForIsr,
} from "@/lib/isr-data";
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
			title: "Documents",
			description: `Documents linked to ${book.title} in the BBRC library.`,
			segment: "documents",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookDocumentsPage({
	params,
}: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, documents] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadApprovedDocumentsForIsr(slug),
	]);

	return (
		<BookDocumentsSection
			bookSlug={book.slug}
			bookTitle={book.title}
			documents={documents.items}
		/>
	);
}
