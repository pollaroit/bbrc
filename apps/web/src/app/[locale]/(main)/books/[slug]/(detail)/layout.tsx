import { BookHeader } from "@/components/blocks/book-header";
import { BookSubnav } from "@/components/blocks/book-subnav";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import {
	loadApprovedDocumentsForIsr,
	loadBookBySlugForIsr,
	loadBookFavoritesForIsr,
	loadBookFeedbackListForIsr,
	loadBookReadsForIsr,
	loadBookShelvesForIsr,
	loadBookSittingCountForIsr,
} from "@/lib/isr-data";
import { bookSlugStaticParams } from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return bookSlugStaticParams(db);
}

export default async function BookDetailLayout({
	children,
	params,
}: LayoutProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;

	const [book, documents, reviews, shelves, reads, favorites, sittings] =
		await Promise.all([
			loadBookBySlugForIsr(slug),
			loadApprovedDocumentsForIsr(slug),
			loadBookFeedbackListForIsr(slug),
			loadBookShelvesForIsr(slug),
			loadBookReadsForIsr(slug),
			loadBookFavoritesForIsr(slug),
			loadBookSittingCountForIsr(slug),
		]);

	return (
		<div className="flex flex-col gap-8">
			{/* In the layout so moving between the book's tabs never counts again. */}
			<TrackDetailView resource="book" itemRef={book.slug} />
			<BookHeader book={book} />
			<BookSubnav
				slug={slug}
				counts={{
					documents: documents.items.length,
					shelves: shelves.items.length,
					reviews: reviews.length,
					reads: reads.total,
					favorites: favorites.total,
					sittings,
				}}
			/>
			{children}
		</div>
	);
}
