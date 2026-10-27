import { defineMessages } from "../../types";

/** Errors of the `achievement` area. Key = what went wrong; ICU parameters like {max}. */
export const achievementErrors = defineMessages({
	awardNotFound: "Award not found",
	memberNotFound: "Member not found",
	notFound: "Achievement not found",
	pinNotEarned: "You can only pin achievements you have earned.",
});
