import { defineMessages } from "../../types";

/** Errors of the `read` area. Key = what went wrong; ICU parameters like {max}. */
export const readErrors = defineMessages({
	bookNotFound: "Book not found",
	editionOfAnotherBook: "That edition belongs to another book.",
	finishDateIncomplete: "Finish month and year must be set together",
	memberNotFound: "Member not found",
	notFound: "Read record not found",
	signInForMutualReads: "Sign in to filter by mutual reads.",
});
