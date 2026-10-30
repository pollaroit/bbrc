/*
 * Why a book cannot go on a sitting poll, as the admin sees it when nominating
 * a book directly. The server decides (it owns the rules that build the poll);
 * this file only names the reasons, orders them and words them, so the screen
 * never carries a rule of its own.
 */

/** Most actionable first: this is the order the screen shows a single reason in. */
export const POLL_NOMINEE_REASONS = [
	"already_in_poll",
	"not_on_wishlist",
	"later_in_series",
	"has_prerequisites",
	"outside_filters",
] as const;

export type PollNomineeReason = (typeof POLL_NOMINEE_REASONS)[number];

/** The poll filters a book can fall outside of. */
export const POLL_NOMINEE_FILTERS = [
	"pages",
	"published_year",
	"rating",
	"country",
	"author",
	"reads",
] as const;

export type PollNomineeFilter = (typeof POLL_NOMINEE_FILTERS)[number];

const REASON_LABELS: Record<PollNomineeReason, string> = {
	already_in_poll: "Already in the poll",
	not_on_wishlist: "Not on the wishlist",
	later_in_series: "Earlier books in the series come first",
	has_prerequisites: "Needs another book read first",
	outside_filters: "Doesn't fit the poll filters",
};

const FILTER_LABELS: Record<PollNomineeFilter, string> = {
	pages: "page count",
	published_year: "publication year",
	rating: "rating",
	country: "country",
	author: "author",
	reads: "number of reads",
};

/** The reasons in display order, without repeats. */
export function sortPollNomineeReasons(
	reasons: readonly PollNomineeReason[],
): PollNomineeReason[] {
	const present = new Set(reasons);
	return POLL_NOMINEE_REASONS.filter((reason) => present.has(reason));
}

/** The one reason to show first (the most actionable), or null when the book fits. */
export function primaryPollNomineeReason(
	reasons: readonly PollNomineeReason[],
): PollNomineeReason | null {
	return sortPollNomineeReasons(reasons)[0] ?? null;
}

/** Label for a reason; for `outside_filters` it names the filters when they are known. */
export function pollNomineeReasonLabel(
	reason: PollNomineeReason,
	filters: readonly PollNomineeFilter[] = [],
): string {
	if (reason === "outside_filters" && filters.length > 0) {
		const names = POLL_NOMINEE_FILTERS.filter((filter) =>
			filters.includes(filter),
		).map((filter) => FILTER_LABELS[filter]);
		return `Outside the filters: ${names.join(", ")}`;
	}
	return REASON_LABELS[reason];
}

/** A book can be picked only when nothing blocks it. Participants who read it only produce a warning. */
export function canNominatePollBook(
	reasons: readonly PollNomineeReason[],
): boolean {
	return reasons.length === 0;
}

/** The warning shown on a pickable book that some participants have already read. */
export function pollNomineeReadWarning(
	readByParticipants: number,
	participantCount: number,
): string | null {
	if (readByParticipants <= 0 || participantCount <= 0) return null;
	return `Read by ${readByParticipants} of ${participantCount} participants`;
}

export type PollNomineeFacts = {
	inPoll: boolean;
	onWishlist: boolean;
	/** Earlier books in its series are all read (or it is not in a series). */
	seriesOrderOk: boolean;
	/** Every book it must be read after is read. */
	prerequisitesOk: boolean;
	/** It passes the poll's filters (pages, years, rating, countries, authors, reads). */
	fitsFilters: boolean;
};

/**
 * The reasons a book cannot go on the poll, from facts the server has worked out.
 * A book off the wishlist is out for that reason alone: its series, prerequisites
 * and filters say nothing useful then.
 */
export function pollNomineeReasons(
	facts: PollNomineeFacts,
): PollNomineeReason[] {
	const reasons: PollNomineeReason[] = [];
	if (facts.inPoll) reasons.push("already_in_poll");
	if (!facts.onWishlist) {
		reasons.push("not_on_wishlist");
	} else {
		if (!facts.seriesOrderOk) reasons.push("later_in_series");
		if (!facts.prerequisitesOk) reasons.push("has_prerequisites");
		if (!facts.fitsFilters) reasons.push("outside_filters");
	}
	return sortPollNomineeReasons(reasons);
}
