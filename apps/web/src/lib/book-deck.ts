/**
 * The tool buttons of the book page (shelf, feedback, favorite, quiz, share)
 * sit in one bordered group with hairline dividers. Each is a bare, square
 * button of the same height; below `md` they share the width and show only
 * their icon, from `md` up they carry a short label.
 */
export const deckButtonClass =
	"h-9 flex-1 gap-2 rounded-none px-3 text-sm md:flex-none";

/** Wrap a deck button's caption in this so it hides on narrow screens. */
export const deckLabelClass = "hidden md:inline";
