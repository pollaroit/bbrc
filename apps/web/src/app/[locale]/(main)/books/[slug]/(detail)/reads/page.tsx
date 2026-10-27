import type { Metadata } from "next";

/** Member reads change often; do not serve a stale ISR snapshot. */
export const dynamic = "force-dynamic";

import { BookReadsPanel } from "@/components/blocks/book-reads-panel";
import { loadBookBySlugForIsr, loadBookReadsForIsr } from "@/lib/isr-data";
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
			title: "Reads",
			description: `Members who finished ${book.title} and when they read it.`,
			segment: "reads",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookReadsPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	const reads = await loadBookReadsForIsr(slug);

	return <BookReadsPanel bookSlug={slug} initialData={reads} />;
}
