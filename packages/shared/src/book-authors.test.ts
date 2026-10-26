import { describe, expect, test } from "bun:test";
import { bookAuthorEntries } from "./book-authors";

describe("bookAuthorEntries", () => {
	test("uses author records when the book is linked", () => {
		const entries = bookAuthorEntries({
			authors: ["Fyodor Dostoevski"],
			authorLinks: [
				{
					author: {
						id: "a1",
						slug: "fyodor_dostoyevsky",
						name: "Fyodor Dostoyevsky",
					},
				},
			],
		});
		expect(entries).toEqual([
			{ key: "a1", label: "Fyodor Dostoyevsky", slug: "fyodor_dostoyevsky" },
		]);
	});

	test("falls back to names for an unlinked book, once per name", () => {
		const entries = bookAuthorEntries({
			authors: ["Jane Austen", " jane austen ", ""],
			authorLinks: [],
		});
		expect(entries.map((entry) => entry.key)).toEqual(["jane austen"]);
		expect(entries[0]?.label).toBe("Jane Austen");
	});

	test("two spellings linked to one author count as one", () => {
		const author = { id: "a1", slug: "x", name: "X" };
		const keys = new Set(
			[
				bookAuthorEntries({ authors: ["X"], authorLinks: [{ author }] }),
				bookAuthorEntries({ authors: ["Ex"], authorLinks: [{ author }] }),
			]
				.flat()
				.map((entry) => entry.key),
		);
		expect(keys.size).toBe(1);
	});
});
