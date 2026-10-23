import { describe, expect, test } from "bun:test";
import { parseBookFilterText, splitFilterSegments } from "./book-filter-dsl";

function ok(text: string) {
	const result = parseBookFilterText(text);
	if (!result.ok) {
		throw new Error(result.error);
	}
	return result.filters;
}

function error(text: string) {
	const result = parseBookFilterText(text);
	return result.ok ? null : result.error;
}

describe("splitFilterSegments", () => {
	test("keeps colons inside brackets", () => {
		expect(splitFilterSegments("a[x:y,z]:p<10")).toEqual(["a[x:y,z]", "p<10"]);
	});
});

describe("parseBookFilterText", () => {
	test("combines segments like AND gates", () => {
		expect(ok("nr:p<400:p>200:y<2010:a[Dostoyevski]")).toEqual({
			viewerRead: "unread",
			minPages: 201,
			maxPages: 399,
			maxPublishedIn: 2009,
			authors: ["dostoyevski"],
		});
	});

	test("supports inclusive operators and equals", () => {
		expect(ok("p<=300:p>=100")).toEqual({ minPages: 100, maxPages: 300 });
		expect(ok("y=1999")).toEqual({
			minPublishedIn: 1999,
			maxPublishedIn: 1999,
		});
	});

	test("read count, review count and club rating", () => {
		expect(ok("r>5:f<=2:cr>3.5:cr<4.5")).toEqual({
			minReads: 6,
			maxFeedbacks: 2,
			minAverageRating: 3.5,
			maxAverageRating: 4.5,
		});
	});

	test("status letters and words", () => {
		expect(ok("w[w,r]")).toEqual({ statuses: ["wishlist", "reading"] });
		expect(ok("w=c")).toEqual({ statuses: ["completed"] });
		expect(ok("w[completed]")).toEqual({ statuses: ["completed"] });
	});

	test("countries with the uk alias and several authors", () => {
		expect(ok("c[uk,us,ru]:a[orwell,huxley]")).toEqual({
			countries: ["GB", "US", "RU"],
			authors: ["orwell", "huxley"],
		});
	});

	test("read flags", () => {
		expect(ok("ir")).toEqual({ viewerRead: "read" });
		expect(ok("not-read")).toEqual({ viewerRead: "unread" });
	});

	test("rejects impossible ranges", () => {
		expect(error("p>100:p<50")).toContain("Impossible pages range");
		expect(error("p<1")).toContain("below 1");
		expect(error("cr>5.5")).toContain("above 5");
	});

	test("rejects conflicting and unknown input", () => {
		expect(error("ir:nr")).toContain("not both");
		expect(error("banana")).toContain("Unknown filter");
		expect(error("p<abc")).toContain("Unknown filter");
		expect(error("p<10.5")).toContain("whole number");
		expect(error("c[xx]")).toContain("country code");
		expect(error("w[z]")).toContain("not a status");
		expect(error("a[]")).toContain("at least one value");
	});
});
