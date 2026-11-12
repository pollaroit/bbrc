import { BookDetailShell } from "@/components/blocks/book-detail-shell";
import { BookHeader } from "@/components/blocks/book-header";
import { BookSubnav } from "@/components/blocks/book-subnav";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { loadBookBySlugForIsr, loadBookPulseForIsr } from "@/lib/isr-data";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export default async function BookDetailLayout({
	children,
	params,
}: LayoutProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, pulse] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadBookPulseForIsr(slug),
	]);

	return (
		<BookDetailShell
			masthead={
				<>
					{/* In the layout so moving between the book's tabs never counts again. */}
					<TrackDetailView resource="book" itemRef={book.slug} />
					<BookHeader book={book} pulse={pulse} />
				</>
			}
			nav={
				<BookSubnav
					slug={slug}
					counts={{
						reviews: pulse.reviews,
						documents: pulse.documents,
						shelves: pulse.shelves,
						sittings: pulse.sittings,
					}}
				/>
			}
		>
			{children}
		</BookDetailShell>
	);
}
