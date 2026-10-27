import { defineMessages } from "../../types";

export const favoriteErrors = defineMessages({
	memberNotFound: "Member not found.",
	limitReached:
		"You can keep at most {max, plural, one {# favorite} other {# favorites}}. Choose one to replace.",
	slotNotYours: "That favorite slot is not yours.",
	addFailed: "Could not add this favorite. Try again.",
});
