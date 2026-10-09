import { BookHeader } from "@/components/blocks/book-header";
import { BookSubnav } from "@/components/blocks/book-subnav";
import {
	loadApprovedDocumentsForIsr,
	loadBookBySlugForIsr,
	loadBookFeedbackListForIsr,
	loadBookReadsForIsr,
	loadBookShelvesForIsr,
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
}: LayoutProps<"/books/[slug]">) {
	const { slug } = await params;

	const [book, documents, reviews, shelves, reads] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadApprovedDocumentsForIsr(slug),
		loadBookFeedbackListForIsr(slug),
		loadBookShelvesForIsr(slug),
		loadBookReadsForIsr(slug),
	]);

	return (
		<div className="flex flex-col gap-8">
			<BookHeader book={book} />
			<BookSubnav
				slug={slug}
				counts={{
					documents: documents.items.length,
					shelves: shelves.items.length,
					reviews: reviews.length,
					reads: reads.total,
				}}
			/>
			{children}
		</div>
	);
}
