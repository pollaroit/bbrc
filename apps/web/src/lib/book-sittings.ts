import type { BookSittingItem } from "@bbrc/api/modules/book/book-sittings.schema";

export const BOOK_SITTING_OUTCOMES = [
	"picked",
	"not_picked",
	"in_poll",
] as const;
export const BOOK_SITTING_STATUSES = ["voting", "reading", "finished"] as const;
export const BOOK_SITTING_SORTS = [
	"newest",
	"oldest",
	"best",
	"votes",
	"participants",
] as const;

export type BookSittingSort = (typeof BOOK_SITTING_SORTS)[number];

export const BOOK_SITTING_OUTCOME_LABELS = {
	picked: "Picked",
	not_picked: "Not picked",
	in_poll: "In a poll now",
} as const;

export const BOOK_SITTING_STATUS_LABELS = {
	voting: "Voting",
	reading: "Reading",
	finished: "Finished",
} as const;

export const BOOK_SITTING_SORT_LABELS: Record<BookSittingSort, string> = {
	newest: "Newest first",
	oldest: "Oldest first",
	best: "Best place first",
	votes: "Most votes",
	participants: "Most participants",
};

export type BookSittingFilters = {
	outcomes: readonly string[] | null;
	statuses: readonly string[] | null;
	year: number | null;
	/** Only sittings the viewer voted in or took part in. */
	mineSlugs: ReadonlySet<string> | null;
	sort: BookSittingSort;
};

function byDateDesc(a: BookSittingItem, b: BookSittingItem) {
	return b.date.localeCompare(a.date);
}

export function filterAndSortBookSittings(
	items: BookSittingItem[],
	filters: BookSittingFilters,
): BookSittingItem[] {
	const filtered = items.filter(
		(item) =>
			(!filters.outcomes?.length || filters.outcomes.includes(item.outcome)) &&
			(!filters.statuses?.length || filters.statuses.includes(item.status)) &&
			(filters.year == null || item.year === filters.year) &&
			(filters.mineSlugs == null || filters.mineSlugs.has(item.sittingSlug)),
	);

	return filtered.sort((a, b) => {
		switch (filters.sort) {
			case "oldest":
				return -byDateDesc(a, b);
			case "best":
				// Picked sittings first, then by place; sittings without a place last.
				return (
					Number(b.outcome === "picked") - Number(a.outcome === "picked") ||
					(a.place ?? Number.POSITIVE_INFINITY) -
						(b.place ?? Number.POSITIVE_INFINITY) ||
					byDateDesc(a, b)
				);
			case "votes":
				return b.voters - a.voters || byDateDesc(a, b);
			case "participants":
				return b.participantCount - a.participantCount || byDateDesc(a, b);
			default:
				// An open poll is the most relevant thing on the page.
				return (
					Number(b.outcome === "in_poll") - Number(a.outcome === "in_poll") ||
					byDateDesc(a, b)
				);
		}
	});
}

export function ordinal(value: number): string {
	const tens = value % 100;
	if (tens >= 11 && tens <= 13) {
		return `${value}th`;
	}
	switch (value % 10) {
		case 1:
			return `${value}st`;
		case 2:
			return `${value}nd`;
		case 3:
			return `${value}rd`;
		default:
			return `${value}th`;
	}
}
