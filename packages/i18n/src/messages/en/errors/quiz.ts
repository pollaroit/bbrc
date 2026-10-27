import { defineMessages } from "../../types";

/** Errors of the `quiz` area. Key = what went wrong; ICU parameters like {max}. */
export const quizErrors = defineMessages({
	aiNotConfigured: "Gemini is not configured.",
	alreadyClosed: "This quiz was already closed.",
	alreadySubmitted: "You already submitted this quiz.",
	bookNotFound: "Book not found",
	clearOnlyUnavailable: "Only unavailable quizzes can be cleared.",
	hasAttempts:
		"This quiz already has attempts, so it can no longer be deleted or regenerated.",
	markReadFirst: "Mark this book as read to take its quiz.",
	modelDeclined: "The model declined to write a quiz for this book.",
	noSubmission: "No submitted quiz found.",
	openBeforeSubmit: "Open the quiz before submitting it.",
	ownAnswersOnly: "Only you can review your own answers.",
	questionNotFound: "Question not found",
	quizNotFound: "Quiz not found",
	reportTakersOnly: "Only people who took the quiz can report a question.",
	signInToTake: "Sign in to take a quiz.",
	submitToSeeResults: "Submit the quiz to see its results.",
	takeToSeeResults: "Take the quiz to see its results.",
	unavailable: "Quizzes are not available right now.",
});
