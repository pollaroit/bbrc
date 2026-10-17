import type { Metadata } from "next";
import { BookFeedbackSection } from "@/components/blocks/book-feedback-section";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import {
	loadBookBySlugForIsr,
	loadBookFeedbackListForIsr,
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
			title: "Reviews",
			description: `Member reviews and ratings for ${book.title}.`,
			segment: "reviews",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookReviewsPage({
	params,
}: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const initialReviews = await loadBookFeedbackListForIsr(slug);

	return (
		<ListingSearchParamsBoundary>
			<BookFeedbackSection bookSlug={slug} initialReviews={initialReviews} />
		</ListingSearchParamsBoundary>
	);
}
