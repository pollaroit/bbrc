import { defineMessages } from "../../types";

/** Errors about members, profiles and account changes. */
export const userErrors = defineMessages({
	notFound: "Member not found.",
	notFoundByUsername:
		"No member with the username {username} exists. Check the username and try again.",
	actionUnavailable: "This action is not available for your account.",
	mutualFilterNeedsSignIn: "Sign in to filter by mutual sittings.",
	invalidStatsPeriod: "This stats period is not valid.",
	nameUnchanged: "Choose a different name than your current one.",
	usernameAccountBlocked: "Your account cannot change its username right now.",
	usernameUnchanged: "Choose a different username than your current one.",
	usernameCooldown:
		"You can change your username again after the cooldown ends.",
	usernameTaken: "That username is already taken.",
	usernameUpdateFailed: "The username update did not complete. Try again.",
});
