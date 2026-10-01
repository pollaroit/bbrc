import type { Metadata } from "next";
import { BookDetail } from "@/components/blocks/book-detail";
import { formatBookAuthors } from "@/lib/book-cover";
import {
	loadBookBySlugForIsr,
	loadBookFeedbackListForIsr,
} from "@/lib/isr-data";
import {
	bookJsonLd,
	bookSlugStaticParams,
	buildNotFoundMetadata,
	buildPageMetadata,
	JsonLd,
} from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return bookSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);

		return buildPageMetadata({
			title: book.title,
			description:
				book.excerpt?.trim() ||
				`${book.title} by ${formatBookAuthors(book.authors)} in the BBRC library.`,
			path: `/books/${book.slug}`,
			openGraph: {
				type: "website",
			},
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookPage({ params }: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, initialReviews] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadBookFeedbackListForIsr(slug),
	]);

	return (
		<>
			<JsonLd data={bookJsonLd(book)} />
			<BookDetail book={book} initialReviews={initialReviews} />
		</>
	);
}
