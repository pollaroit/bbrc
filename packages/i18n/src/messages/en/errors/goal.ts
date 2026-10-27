import { defineMessages } from "../../types";

/** Errors of the `goal` area. Key = what went wrong; ICU parameters like {max}. */
export const goalErrors = defineMessages({
	duplicate:
		"You already have a goal for this year with the same scope. Change the scope or pick another year.",
	expiredYearLocked: "The year on an expired goal cannot be changed.",
	notFound: "Goal not found",
	yearOutOfRange: "Goals can only use {min} or {max} as the year.",
});
