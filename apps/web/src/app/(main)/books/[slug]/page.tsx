import type { Metadata } from "next";
import { cache } from "react";
import { BookDetail } from "@/components/blocks/book-detail";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import {
	bookJsonLd,
	bookSlugStaticParams,
	buildNotFoundMetadata,
	buildPageMetadata,
	DETAIL_PAGE_REVALIDATE_SECONDS,
	JsonLd,
} from "@/lib/seo";
import { db } from "@/services";
import { orpc } from "@/utils/orpc";

export const revalidate = DETAIL_PAGE_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
	return bookSlugStaticParams(db);
}

const loadBookBySlug = cache((slug: string) =>
	orpc.book.getBookBySlug.call(slug),
);

const loadBookFeedbackList = cache((slug: string) =>
	orpc.feedback.getBookFeedbackList.call(slug),
);

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlug(slug);
		const cover = bookCoverUrl(book.coverId, "L");

		return buildPageMetadata({
			title: book.title,
			description:
				book.excerpt?.trim() ||
				`${book.title} by ${formatBookAuthors(book.authors)} in the BBRC library.`,
			path: `/books/${book.slug}`,
			openGraph: {
				type: "website",
				...(cover ? { images: [{ url: cover, alt: book.title }] } : {}),
			},
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookPage({ params }: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, initialReviews] = await Promise.all([
		loadBookBySlug(slug),
		loadBookFeedbackList(slug),
	]);

	return (
		<>
			<JsonLd data={bookJsonLd(book)} />
			<BookDetail book={book} initialReviews={initialReviews} />
		</>
	);
}
