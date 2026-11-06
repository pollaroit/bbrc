import { describe, expect, it } from "bun:test";
import { memberStatsShareFacts, statsShareText } from "./index";

const input = {
	title: "Reader's 2026 in books",
	periodLabel: "2026",
	member: { name: "Reader", username: "reader" },
	scoreboard: [
		{ id: "subject", label: "Favourite subject", value: "Fantasy", unit: null },
		{ id: "pages", label: "Pages read", value: "3,200", unit: "pages" },
		{ id: "books", label: "Books read", value: "12", unit: "books" },
		{ id: "time", label: "Time read", value: "41.5", unit: "h" },
		{ id: "streak", label: "Reading streak", value: "6", unit: "days" },
		{ id: "rating", label: "Average rating given", value: "4.2", unit: "★" },
	],
	books: Array.from({ length: 9 }, (_, index) => ({
		slug: `b${index}`,
		title: `Book ${index}`,
		coverId: index,
	})),
	rank: { rank: 2, of: 14, topPercent: 15 },
	topAuthor: "Ana Quill",
};

describe("memberStatsShareFacts", () => {
	it("keeps four headline numbers in a fixed order, with hours spelled out", () => {
		const facts = memberStatsShareFacts(input);
		expect(facts.numbers.map((n) => n.label)).toEqual([
			"Books read",
			"Pages read",
			"Time read",
			"Average rating given",
		]);
		expect(facts.numbers[2]?.value).toBe("41.5 h");
	});

	it("takes a few covers, a line about taste and the rank", () => {
		const facts = memberStatsShareFacts(input, { covers: 4 });
		expect(facts.covers).toHaveLength(4);
		expect(facts.highlights).toEqual([
			"Favourite subject: Fantasy",
			"Most read author: Ana Quill",
		]);
		expect(facts.rankLine).toBe("#2 of 14 readers in the club");
	});

	it("leaves out what the member does not have", () => {
		const facts = memberStatsShareFacts({
			...input,
			scoreboard: input.scoreboard.filter((t) => t.id === "books"),
			rank: null,
			topAuthor: null,
		});
		expect(facts.numbers).toEqual([{ label: "Books read", value: "12" }]);
		expect(facts.highlights).toEqual([]);
		expect(facts.rankLine).toBeNull();
	});
});

describe("statsShareText", () => {
	it("is the title, the numbers on one line, the taste lines, the rank and the link", () => {
		const text = statsShareText(
			memberStatsShareFacts(input),
			"https://bbrc.app/users/reader/stats",
		);
		expect(text.split("\n")).toEqual([
			"Reader's 2026 in books",
			"12 books read · 3,200 pages read · 41.5 h time read · 4.2 average rating given",
			"Favourite subject: Fantasy",
			"Most read author: Ana Quill",
			"#2 of 14 readers in the club",
			"https://bbrc.app/users/reader/stats",
		]);
	});
});
