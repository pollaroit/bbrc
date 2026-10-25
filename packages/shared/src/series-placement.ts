/**
 * Where a book goes in a series, and what the series looks like afterwards.
 * Mirrors the server rule in `placeBookInSeries` so the picker can show the
 * result before saving. Positions are whole numbers, or one decimal (1.5).
 */

export type SeriesPlacementValue = {
	/** `null` puts the book at the end. */
	position: number | null;
	/** When a whole number is taken, move the later books down by one. */
	shiftLater: boolean;
};

export type SeriesPlacementBook = {
	slug: string;
	title: string;
	position: number;
};

export type SeriesPlacementPreviewRow = {
	/** `null` for the book being placed. */
	slug: string | null;
	title: string;
	position: number;
	isNew: boolean;
	/** An existing book that moves down by one. */
	moved: boolean;
};

export type SeriesPlacementPreview = {
	rows: SeriesPlacementPreviewRow[];
	/** The number the new book ends up with. */
	position: number;
	/** Why this placement cannot be saved, in plain words. */
	error: string | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function sortSeriesBooks(
	books: readonly SeriesPlacementBook[],
): SeriesPlacementBook[] {
	return [...books].sort((a, b) => a.position - b.position);
}

/** The number a book gets when it goes to the end. */
export function endPosition(books: readonly SeriesPlacementBook[]): number {
	const last = sortSeriesBooks(books).at(-1);
	return last ? Math.floor(last.position) + 1 : 1;
}

export function previewSeriesPlacement(
	books: readonly SeriesPlacementBook[],
	placement: SeriesPlacementValue,
	newTitle: string,
): SeriesPlacementPreview {
	const sorted = sortSeriesBooks(books);
	const position = placement.position ?? endPosition(sorted);
	const taken = sorted.find((book) => book.position === position);

	let error: string | null = null;
	if (taken && !(placement.shiftLater && Number.isInteger(position))) {
		error = Number.isInteger(position)
			? `Place ${position} is taken by “${taken.title}”. Move the later books down or pick another place.`
			: `Place ${position} is taken by “${taken.title}”. Pick another half step.`;
	}

	const shifts = Boolean(taken) && !error;
	const rows: SeriesPlacementPreviewRow[] = sorted.map((book) => {
		const moved = shifts && book.position >= position;
		return {
			slug: book.slug,
			title: book.title,
			position: moved ? book.position + 1 : book.position,
			isNew: false,
			moved,
		};
	});
	rows.push({
		slug: null,
		title: newTitle,
		position,
		isNew: true,
		moved: false,
	});
	rows.sort((a, b) => a.position - b.position);
	return { rows, position, error };
}

/** The slot (0 to n) the placement currently sits in; n means the end. */
export function placementToSlot(
	books: readonly SeriesPlacementBook[],
	placement: SeriesPlacementValue,
): number {
	const sorted = sortSeriesBooks(books);
	if (placement.position == null) return sorted.length;
	const position = placement.position;
	const index = sorted.findIndex((book) =>
		Number.isInteger(position) && placement.shiftLater
			? book.position >= position
			: book.position > position,
	);
	return index === -1 ? sorted.length : index;
}

/**
 * The placement for dropping the new book into slot `slot` (before the book at
 * that index; `n` is the end). With `halfStep`, the book gets a number between
 * its neighbours instead of pushing the later books down. Returns `null` when
 * there is no room for a half step there.
 */
export function slotToPlacement(
	books: readonly SeriesPlacementBook[],
	slot: number,
	halfStep: boolean,
): SeriesPlacementValue | null {
	const sorted = sortSeriesBooks(books);
	if (slot >= sorted.length) return { position: null, shiftLater: false };

	const next = sorted[slot];
	if (!next) return { position: null, shiftLater: false };

	if (!halfStep) {
		const whole = Number.isInteger(next.position)
			? next.position
			: Math.ceil(next.position);
		const taken = sorted.some((book) => book.position === whole);
		return { position: whole, shiftLater: taken };
	}

	const previous = slot > 0 ? (sorted[slot - 1]?.position ?? 0) : 0;
	const middle = round1((previous + next.position) / 2);
	if (middle <= previous || middle >= next.position || middle < 0.1) {
		return null;
	}
	return { position: middle, shiftLater: false };
}

/** "#2" or "#1.5". */
export function formatSeriesNumber(position: number): string {
	return `#${Number.isInteger(position) ? position : position.toFixed(1)}`;
}
