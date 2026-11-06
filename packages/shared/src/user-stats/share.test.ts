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

import { parseStoredContent, statsSharePostContent } from "../index";

describe("statsSharePostContent", () => {
	const facts = memberStatsShareFacts(input);

	it("is paragraphs with a real link at the end", () => {
		const doc = parseStoredContent(
			statsSharePostContent(
				facts,
				"https://bbrc.app/users/reader/stats?period_type=life",
			),
		);
		expect(doc.blocks.map((block) => block.t)).toEqual(["p", "p", "p", "p"]);
		const last = doc.blocks[3];
		expect(last && "inline" in last ? last.inline[0] : null).toEqual({
			t: "link",
			href: "https://bbrc.app/users/reader/stats?period_type=life",
			label: "See the full stats",
			internal: undefined,
		});
		const first = doc.blocks[0];
		expect(first && "inline" in first ? first.inline[0] : null).toMatchObject({
			t: "text",
			s: "Reader's 2026 in books",
			m: ["bold"],
		});
	});

	it("keeps the taste lines together in one paragraph, one per line", () => {
		const doc = parseStoredContent(
			statsSharePostContent(facts, "https://bbrc.app/x"),
		);
		const third = doc.blocks[2];
		expect(
			third && "inline" in third && third.inline[0] && "s" in third.inline[0]
				? third.inline[0].s
				: "",
		).toBe(
			"Favourite subject: Fantasy\nMost read author: Ana Quill\n#2 of 14 readers in the club",
		);
	});

	it("leaves out the taste paragraph when there is nothing to say", () => {
		const bare = memberStatsShareFacts({
			...input,
			scoreboard: [],
			rank: null,
			topAuthor: null,
		});
		const doc = parseStoredContent(
			statsSharePostContent(bare, "https://bbrc.app/x"),
		);
		expect(doc.blocks).toHaveLength(2);
	});

	it("cannot keep a link that is not https, so the label stays as text", () => {
		const doc = parseStoredContent(
			statsSharePostContent(facts, "http://localhost:3001/x"),
		);
		const last = doc.blocks.at(-1);
		expect(last && "inline" in last ? last.inline[0] : null).toEqual({
			t: "text",
			s: "See the full stats",
		});
	});
});
