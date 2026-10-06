import { getBookFeedbackState } from "@bbrc/api/modules/feedback/feedback.service";
import type { Database } from "@bbrc/db";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";

export type BookStoryContent = {
	title: string;
	authorsLine: string;
	coverUrl: string | null;
	/** Viewer’s club rating (0–5, half steps); only when logged in with feedback. */
	myRating: number | null;
};

export async function resolveBookStoryContent(
	bookSlug: string,
	db: Database,
	viewerUserId: string | null,
): Promise<BookStoryContent | null> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: {
			title: true,
			authors: true,
			coverId: true,
		},
	});

	if (!book) {
		return null;
	}

	let myRating: number | null = null;

	if (viewerUserId) {
		const state = await getBookFeedbackState(bookSlug, viewerUserId, db);
		myRating = state.myFeedback?.rating ?? null;
	}

	return {
		title: book.title,
		authorsLine: formatBookAuthors(book.authors),
		coverUrl: bookCoverUrl(book.coverId, "L"),
		myRating,
	};
}
