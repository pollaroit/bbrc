import { describe, expect, test } from "bun:test";
import {
	authorNameKey,
	authorNameSimilarity,
	formatAuthorDate,
	formatAuthorLifespan,
	isLikelySameAuthor,
	looseAuthorKey,
} from "./author-name";

describe("keys", () => {
	test("dots, accents, case and Last, First are ignored", () => {
		expect(authorNameKey("Tolkien, J. R. R.")).toBe("j r r tolkien");
		expect(authorNameKey("J.R.R. Tolkien")).toBe("j r r tolkien");
		expect(authorNameKey("Emily BRONTË")).toBe("emily bronte");
	});
	test("honorifics and Jr are dropped", () => {
		expect(authorNameKey("Dr. Martin Luther King Jr.")).toBe(
			"martin luther king",
		);
	});
	test("loose key flattens transliteration", () => {
		expect(looseAuthorKey("Fyodor Dostoyevsky")).toBe("fiodor dostoievski");
		expect(looseAuthorKey("Fiodor Dostoevski")).toBe("fiodor dostoevski");
	});
});

describe("same person?", () => {
	const yes: [string, string][] = [
		["Fyodor Dostoyevsky", "Fiodor Dostoevski"],
		["J. R. R. Tolkien", "John Ronald Reuel Tolkien"],
		["Tolkien, J.R.R.", "J. R. R. Tolkien"],
		["Leo Tolstoy", "Lev Tolstoi"],
		["Gabriel García Márquez", "Gabriel Garcia Marquez"],
		["Alexandre Dumas", "Alexander Dumas"],
	];
	for (const [a, b] of yes) {
		test(`${a} = ${b}`, () => expect(isLikelySameAuthor(a, b)).toBe(true));
	}

	const no: [string, string][] = [
		["Anne Brontë", "Charlotte Brontë"],
		["Stephen King", "Stephen Kane"],
		["Isaac Asimov", "Arthur Clarke"],
		["Jane Austen", "Jane Smith"],
	];
	for (const [a, b] of no) {
		test(`${a} ≠ ${b}`, () => expect(isLikelySameAuthor(a, b)).toBe(false));
	}

	test("identical names score 1", () => {
		expect(authorNameSimilarity("Toni Morrison", "toni morrison")).toBe(1);
	});
});

describe("dates", () => {
	test("precision", () => {
		expect(formatAuthorDate({ year: 1821 })).toBe("1821");
		expect(formatAuthorDate({ year: 1821, month: 11 })).toBe("Nov 1821");
		expect(formatAuthorDate({ year: 1821, month: 11, day: 11 })).toBe(
			"11 Nov 1821",
		);
		expect(formatAuthorDate({ year: -384 })).toBe("384 BC");
		expect(formatAuthorDate({ year: null })).toBeNull();
	});
	test("lifespan", () => {
		expect(
			formatAuthorLifespan({ birth: { year: 1821 }, death: { year: 1881 } }),
		).toBe("1821–1881");
		expect(
			formatAuthorLifespan({ birth: { year: 1965 }, death: { year: null } }),
		).toBe("b. 1965");
		expect(
			formatAuthorLifespan({ birth: { year: null }, death: { year: null } }),
		).toBeNull();
	});
});
