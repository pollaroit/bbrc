import { defineMessages } from "../../types";

/**
 * Interface texts shared by every area: generic buttons, states and short words. Area groups
 * keep their own texts; use these only when the meaning is exactly the same everywhere.
 */
export const common = defineMessages({
	actions: {
		apply: "Apply",
		back: "Back",
		cancel: "Cancel",
		clear: "Clear",
		close: "Close",
		confirm: "Confirm",
		copy: "Copy",
		delete: "Delete",
		done: "Done",
		edit: "Edit",
		next: "Next",
		previous: "Previous",
		reset: "Reset",
		retry: "Try again",
		save: "Save",
		search: "Search",
		share: "Share",
		showLess: "Show less",
		showMore: "Show more",
		submit: "Submit",
		viewAll: "View all",
	},
	states: {
		copied: "Copied",
		loading: "Loading…",
		noResults: "No results",
		saving: "Saving…",
		saved: "Saved",
		optional: "Optional",
		required: "Required",
	},
	words: {
		and: "and",
		no: "No",
		or: "or",
		you: "You",
		yes: "Yes",
	},
});
