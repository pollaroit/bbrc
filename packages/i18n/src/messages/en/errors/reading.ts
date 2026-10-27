import { defineMessages } from "../../types";

/** Errors of the `reading` area. Key = what went wrong; ICU parameters like {max}. */
export const readingErrors = defineMessages({
	alreadyFinished: "This book is already finished.",
	alreadyRead: "You have already read this book.",
	bookNotFound: "Book not found",
	editionOfAnotherBook: "That edition belongs to another book.",
	finishedCannotBeDropped: "A finished book cannot be dropped.",
	memberNotFound: "Member not found",
	notFound: "Reading not found",
	pagesNeeded: "Add the number of pages to track by page.",
	sittingNotFound: "Sitting not found",
	tooManyActive:
		"You can read {max} books at a time. Finish or drop one first.",
	wishlistFull: "Your wishlist can hold {max} books.",
});
