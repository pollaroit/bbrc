import { defineMessages } from "../../types";

/** Errors any part of the API can raise. */
export const commonErrors = defineMessages({
	notSignedIn: "You must be signed in to do this.",
	statusNotAllowed: "Your account status does not allow this.",
	adminOnly: "Only admins can do this.",
	contentEmpty: "The text must have at least one character.",
	contentInvalid: "This text is not valid.",
	contentTooLong: "The text can have at most {max} characters.",
	reviewInvalid: "This review is not valid.",
	reviewTooLong: "A review can have at most {max} characters.",
	invalidBookPages: "The book must have at least 1 page.",
	apiUnreachable: "Could not reach the API.",
});
