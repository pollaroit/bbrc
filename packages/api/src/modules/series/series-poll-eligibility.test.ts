import { describe, expect, it } from "bun:test";
import { prerequisitesSatisfiedForPoll } from "../book/book-reading-prerequisites";
import {
	seriesPriorBooksSatisfiedForPoll,
	wishlistBookEligibleForPoll,
} from "./series-poll-eligibility";

const row = (position: number, status: string, hidden = false) => ({
	position,
	book: { status, hidden },
});

describe("seriesPriorBooksSatisfiedForPoll", () => {
	it("needs every earlier volume completed", () => {
		expect(
			seriesPriorBooksSatisfiedForPoll(3, [
				row(1, "completed"),
				row(2, "wishlist"),
			]),
		).toBe(false);
		expect(
			seriesPriorBooksSatisfiedForPoll(3, [
				row(1, "completed"),
				row(2, "completed"),
			]),
		).toBe(true);
	});

	it("does not let a hidden earlier volume hold the series back", () => {
		expect(
			seriesPriorBooksSatisfiedForPoll(2, [row(1, "wishlist", true)]),
		).toBe(true);
		expect(
			seriesPriorBooksSatisfiedForPoll(3, [
				row(1, "wishlist", true),
				row(2, "wishlist"),
			]),
		).toBe(false);
	});
});

describe("prerequisitesSatisfiedForPoll", () => {
	it("skips hidden prerequisites", () => {
		expect(
			prerequisitesSatisfiedForPoll([{ status: "wishlist", hidden: true }]),
		).toBe(true);
		expect(
			prerequisitesSatisfiedForPoll([
				{ status: "wishlist", hidden: true },
				{ status: "reading" },
			]),
		).toBe(false);
		expect(prerequisitesSatisfiedForPoll([])).toBe(true);
	});
});

describe("wishlistBookEligibleForPoll", () => {
	it("applies both rules to a book in a series with a hidden first volume", () => {
		const seriesBooks = new Map([["s1", [row(1, "wishlist", true)]]]);
		expect(
			wishlistBookEligibleForPoll(
				{
					readAfterPrerequisites: [
						{ prerequisiteBook: { status: "wishlist", hidden: true } },
					],
					seriesMembership: { position: 2, seriesId: "s1" },
				},
				seriesBooks,
			),
		).toBe(true);
	});
});
