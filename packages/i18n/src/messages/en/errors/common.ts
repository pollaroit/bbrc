import { defineMessages } from "../../types";

/** Errors any part of the API can raise. */
export const commonErrors = defineMessages({
	notSignedIn: "You must be signed in to do this.",
	statusNotAllowed: "Your account status does not allow this.",
	adminOnly: "Only admins can do this.",
});
