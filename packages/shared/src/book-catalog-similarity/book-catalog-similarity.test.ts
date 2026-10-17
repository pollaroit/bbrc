import { describe, expect, it } from "bun:test";
import {
	formatPublicationDecadeLabel,
	publicationDecade,
	scoreCatalogBookSimilarity,
	similarPageCount,
} from "./index";

const baseBook = {
	authors: ["leo_tolstoy"],
	subjects: ["war", "russia"],
	subjectPeople: [],
	subjectTimes: ["19th_century"],
	countries: ["RU"],
	pages: 400,
	publishedIn: 1869,
};

describe("scoreCatalogBookSimilarity", () => {
	it("ranks closer metadata higher than unrelated books", () => {
		const close = {
			...baseBook,
			authors: ["leo_tolstoy"],
			subjects: ["war", "historical_fiction"],
			pages: 420,
			publishedIn: 1877,
		};
		const far = {
			authors: ["agatha_christie"],
			subjects: ["mystery"],
			subjectPeople: [],
			subjectTimes: [],
			countries: ["GB"],
			pages: 220,
			publishedIn: 1934,
		};

		expect(scoreCatalogBookSimilarity(baseBook, close)).toBeGreaterThan(
			scoreCatalogBookSimilarity(baseBook, far),
		);
	});
});

describe("publicationDecade", () => {
	it("labels decades for display", () => {
		expect(publicationDecade(1994)).toBe(1990);
		expect(formatPublicationDecadeLabel(1994)).toBe("1990s");
	});
});

describe("similarPageCount", () => {
	it("allows ±100 pages by default", () => {
		expect(similarPageCount(400, 480)).toBe(true);
		expect(similarPageCount(400, 520)).toBe(false);
	});
});
