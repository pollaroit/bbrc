/*
 * The small accents of the book page: an icon, a bar, a star, the line under
 * the open tab. Colour is never a filled surface here; surfaces stay on the
 * app's own tokens. Every class is written out so Tailwind finds it.
 */

export type BookTone = "info" | "violet" | "pink" | "success" | "warning";

export type BookToneClasses = {
	/** Readable text or icon colour in the tone. */
	ink: string;
	/** A solid fill for a thin bar or marker. */
	solid: string;
	/** The line under the open tab. */
	underline: string;
};

export const BOOK_TONES: Record<BookTone, BookToneClasses> = {
	info: { ink: "text-info-ink", solid: "bg-info", underline: "border-info" },
	violet: {
		ink: "text-violet-ink",
		solid: "bg-violet",
		underline: "border-violet",
	},
	pink: { ink: "text-pink-ink", solid: "bg-pink", underline: "border-pink" },
	success: {
		ink: "text-success-ink",
		solid: "bg-success",
		underline: "border-success",
	},
	warning: {
		ink: "text-warning-ink",
		solid: "bg-warning",
		underline: "border-warning",
	},
};

const COVER_TONES: BookTone[] = [
	"info",
	"violet",
	"pink",
	"success",
	"warning",
];

/** One stable accent per book (its slug picks it), for covers without a picture. */
export function bookTone(seed: string): BookTone {
	let hash = 5381;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 33) ^ seed.charCodeAt(i);
	}
	return COVER_TONES[Math.abs(hash) % COVER_TONES.length] ?? "info";
}
