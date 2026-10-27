import { defineMessages } from "../types";

/**
 * Names of the values of enums and statuses (the identifiers stay in code). Grouped by area;
 * the key is the enum value, so `labels.progress.in_progress`.
 */
export const labels = defineMessages({
	progress: {
		not_started: "Not started",
		in_progress: "Reading",
		completed: "Completed",
		dnf: "Did not finish",
	},
	sittingStatus: {
		voting: "Voting",
		reading: "Reading",
		finished: "Finished",
	},
	bookStatus: {
		completed: "Completed",
		reading: "Reading",
		wishlist: "Wishlist",
		description: {
			completed: "The club has finished reading this title.",
			reading: "This book is in an active club read.",
			wishlist: "Queued for a future sitting or vote.",
		},
	},
});
