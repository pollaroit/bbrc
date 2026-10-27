import { defineMessages } from "../../types";

/** Errors of editions (Open Library and member-added ones). */
export const editionErrors = defineMessages({
	notFound: "Edition not found.",
	alreadyListed: "This edition (same ISBN) is already listed.",
	dailyLimit:
		"You can add {count, plural, one {# edition} other {# editions}} a day. Try again tomorrow.",
	onlyOwnerOrAdminEdit: "Only the member who added it or an admin can edit it.",
	onlyOwnerOrAdminDelete:
		"Only the member who added it or an admin can delete it.",
	inUseAdminOnlyDelete:
		"Members are using this edition, so only an admin can delete it.",
	pickTwoDifferent: "Pick two different editions.",
	differentBooks: "Those editions belong to different books.",
	openLibraryEditionNotFound:
		"That Open Library edition was not found for this book.",
	openLibraryEditionLinked:
		"Another member edition is already linked to that Open Library edition.",
});
