import type { Metadata } from "next";
import { cache } from "react";
import { BookDetail } from "@/components/blocks/book-detail";
import { formatBookAuthors } from "@/lib/book-cover";
import { orpc } from "@/utils/orpc";

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

		return {
			title: book.title,
			description:
				book.excerpt?.slice(0, 160) ??
				`${book.title} by ${formatBookAuthors(book.authors)} in the BBRC library.`,
		};
	} catch {
		return {
			title: "Book not found",
			description: "This book could not be found in the library.",
		};
	}
}

export default async function BookPage({ params }: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, initialReviews] = await Promise.all([
		loadBookBySlug(slug),
		loadBookFeedbackList(slug),
	]);

	return <BookDetail book={book} initialReviews={initialReviews} />;
}
