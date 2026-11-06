import { describe, expect, it } from "bun:test";
import { bookHideBlockedMessage, bookHideBlockers } from "./book-hidden";

const free = {
	status: "wishlist",
	selectedForSitting: false,
	onVotingPoll: false,
} as const;

describe("bookHideBlockers", () => {
	it("lets a wishlist book that no sitting has claimed be hidden", () => {
		expect(bookHideBlockers(free)).toEqual([]);
		expect(bookHideBlockedMessage(free)).toBeNull();
	});

	it("blocks a book on the poll of a voting sitting", () => {
		expect(bookHideBlockers({ ...free, onVotingPoll: true })).toEqual([
			"on_voting_poll",
		]);
	});

	it("blocks a book a sitting has picked, whatever its phase", () => {
		expect(
			bookHideBlockers({
				status: "reading",
				selectedForSitting: true,
				onVotingPoll: false,
			}),
		).toEqual(["selected_for_sitting", "not_on_wishlist"]);
		expect(
			bookHideBlockedMessage({
				status: "completed",
				selectedForSitting: true,
				onVotingPoll: false,
			}),
		).toContain("already picked");
	});

	it("blocks a book that is being read even if no pick is recorded", () => {
		expect(bookHideBlockers({ ...free, status: "reading" })).toEqual([
			"not_on_wishlist",
		]);
	});
});
