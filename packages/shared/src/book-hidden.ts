/*
 * Hidden books are never offered to a sitting. Admins can hide a book only while no
 * sitting has claimed it, and can always unhide one. The server reads the facts; this
 * file decides and words the answer, so the screen never carries a rule of its own.
 */

export const BOOK_HIDE_BLOCKERS = [
	"selected_for_sitting",
	"on_voting_poll",
	"not_on_wishlist",
] as const;

export type BookHideBlocker = (typeof BOOK_HIDE_BLOCKERS)[number];

export type BookHideFacts = {
	/** `Book.status`: a sitting that picked the book moves it to reading, then completed. */
	status: "wishlist" | "reading" | "completed";
	/** Some sitting (any phase) has this book as its pick. */
	selectedForSitting: boolean;
	/** It is an option on the poll of a sitting that is still voting. */
	onVotingPoll: boolean;
};

const BLOCKER_MESSAGES: Record<BookHideBlocker, string> = {
	selected_for_sitting: "A sitting has already picked this book.",
	on_voting_poll: "It is on the poll of a sitting that is still voting.",
	not_on_wishlist: "It is being read or has been read in a sitting.",
};

/** What stops a book from being hidden, most specific first; empty when it can be hidden. */
export function bookHideBlockers(facts: BookHideFacts): BookHideBlocker[] {
	const blockers: BookHideBlocker[] = [];
	if (facts.selectedForSitting) blockers.push("selected_for_sitting");
	if (facts.onVotingPoll) blockers.push("on_voting_poll");
	if (facts.status !== "wishlist") blockers.push("not_on_wishlist");
	return blockers;
}

/** One sentence for the first blocker, or null when the book can be hidden. */
export function bookHideBlockedMessage(facts: BookHideFacts): string | null {
	const [first] = bookHideBlockers(facts);
	return first
		? `This book cannot be hidden. ${BLOCKER_MESSAGES[first]}`
		: null;
}
