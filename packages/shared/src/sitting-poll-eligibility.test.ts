import { describe, expect, test } from "bun:test";
import {
	canNominatePollBook,
	POLL_NOMINEE_REASONS,
	pollNomineeReadWarning,
	pollNomineeReasonLabel,
	pollNomineeReasons,
	primaryPollNomineeReason,
	sortPollNomineeReasons,
} from "./sitting-poll-eligibility";

describe("poll nominee reasons", () => {
	test("reasons come out in the fixed, most actionable order without repeats", () => {
		expect(
			sortPollNomineeReasons([
				"outside_filters",
				"already_in_poll",
				"has_prerequisites",
				"already_in_poll",
			]),
		).toEqual(["already_in_poll", "has_prerequisites", "outside_filters"]);
		expect(sortPollNomineeReasons([])).toEqual([]);
	});

	test("the primary reason is the first in that order, none when the book fits", () => {
		expect(
			primaryPollNomineeReason(["outside_filters", "not_on_wishlist"]),
		).toBe("not_on_wishlist");
		expect(primaryPollNomineeReason([])).toBeNull();
	});

	test("every reason has a label, and filter reasons name the filters", () => {
		for (const reason of POLL_NOMINEE_REASONS) {
			expect(pollNomineeReasonLabel(reason).length).toBeGreaterThan(3);
		}
		expect(pollNomineeReasonLabel("outside_filters", ["rating", "pages"])).toBe(
			"Outside the filters: page count, rating",
		);
		expect(pollNomineeReasonLabel("outside_filters")).toBe(
			"Doesn't fit the poll filters",
		);
	});

	test("only a book with no reason can be nominated", () => {
		expect(canNominatePollBook([])).toBe(true);
		expect(canNominatePollBook(["already_in_poll"])).toBe(false);
	});

	test("a read warning appears only when someone has read it", () => {
		expect(pollNomineeReadWarning(0, 5)).toBeNull();
		expect(pollNomineeReadWarning(3, 5)).toBe("Read by 3 of 5 participants");
		expect(pollNomineeReadWarning(1, 0)).toBeNull();
	});
});

describe("pollNomineeReasons", () => {
	const fits = {
		inPoll: false,
		onWishlist: true,
		seriesOrderOk: true,
		prerequisitesOk: true,
		fitsFilters: true,
	};

	test("a book that fits has no reasons", () => {
		expect(pollNomineeReasons(fits)).toEqual([]);
	});

	test("each failing fact gives its own reason, in display order", () => {
		expect(pollNomineeReasons({ ...fits, inPoll: true })).toEqual([
			"already_in_poll",
		]);
		expect(
			pollNomineeReasons({
				...fits,
				fitsFilters: false,
				prerequisitesOk: false,
				seriesOrderOk: false,
			}),
		).toEqual(["later_in_series", "has_prerequisites", "outside_filters"]);
	});

	test("a book off the wishlist is out for that reason alone", () => {
		expect(
			pollNomineeReasons({
				...fits,
				onWishlist: false,
				fitsFilters: false,
				prerequisitesOk: false,
			}),
		).toEqual(["not_on_wishlist"]);
		expect(
			pollNomineeReasons({ ...fits, onWishlist: false, inPoll: true }),
		).toEqual(["already_in_poll", "not_on_wishlist"]);
	});
});
