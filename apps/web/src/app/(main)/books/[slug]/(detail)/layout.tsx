import { BookHeader } from "@/components/blocks/book-header";
import { BookSubnav } from "@/components/blocks/book-subnav";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { loadBookBySlugForIsr } from "@/lib/isr-data";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export default async function BookDetailLayout({
	children,
	params,
}: LayoutProps<"/books/[slug]">) {
	const { slug } = await params;
	const book = await loadBookBySlugForIsr(slug);

	return (
		<div className="flex flex-col gap-8">
			{/* In the layout so moving between the book's tabs never counts again. */}
			<TrackDetailView resource="book" itemRef={book.slug} />
			<BookHeader book={book} />
			<BookSubnav slug={slug} />
			{children}
		</div>
	);
}
