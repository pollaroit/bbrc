import type { Metadata } from "next";

/** Scores change as members finish; do not serve a stale ISR snapshot. */
export const dynamic = "force-dynamic";

import { BookQuizzesList } from "@/components/blocks/book-quizzes-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
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
			title: "Quizzes",
			description: `How club members scored on the ${book.title} quiz.`,
			segment: "quizzes",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookQuizzesPage({
	params,
}: PageProps<"/books/[slug]">) {
	const { slug } = await params;

	return (
		<ListingSearchParamsBoundary>
			<BookQuizzesList bookSlug={slug} />
		</ListingSearchParamsBoundary>
	);
}
