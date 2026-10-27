import { defineMessages } from "../../types";

/** Errors of the book catalog: lookups, adding and editing books, covers, reading order. */
export const bookErrors = defineMessages({
	notFound: "Book not found.",
	signInToFilterReads: "Sign in to filter by your own reads.",
	noBookMatchesFilters: "No book matches these filters.",
	authorGone: "One of the authors no longer exists. Pick them again.",
	alreadyInCatalog:
		"A book with this Open Library ID is already in the catalog.",
	removeOnlyWishlist:
		"Only wishlist books can be removed. Change the status or keep the title in the catalog.",
	slugFailed:
		"Could not create a web address for this book. Try a different title.",
	coverNotUploaded: "That cover was not uploaded here. Upload it again.",
	coverIdFailed: "Could not save the cover. Try again.",
	notOnBlockList: "This work is not on the block list.",
	aiNotAvailable: "AI suggestions are not available right now.",
	aiFailed: "The AI suggestion could not be made. Try again in a moment.",
	readAfterDuplicates: "The read-after books must not include duplicates.",
	readAfterNotFound:
		"One or more read-after books were not found in the catalog.",
	readAfterSelf: "A book cannot require itself as a prior read.",
	readAfterCycle:
		"This read-after order would create a cycle. Check the earlier books in the series.",
	eligibility: {
		cannotFavorite: "You cannot favorite this book right now.",
		markRead:
			"Mark this book as read on its page, or finish it in a sitting that chose this book.",
		markCompleted:
			"Mark yourself as completed on that sitting's page, or mark the book as read on its page.",
	},
});
