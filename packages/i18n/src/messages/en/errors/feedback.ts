import { defineMessages } from "../../types";

export const feedbackErrors = defineMessages({
	bookNotFound: "Book not found",
	notFound: "Feedback not found",
	userNotFound: "User not found",
	signInForMutual: "Sign in to filter by mutual reviews.",
	alreadyReviewed: "You already left feedback for this book",
	markReadFirst:
		"Mark the book completed on the sitting page before leaving feedback",
	noReviewForBook: "You have not left feedback for this book",
	slugFailed: "Failed to generate feedback slug",
});
