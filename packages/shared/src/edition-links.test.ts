import { describe, expect, test } from "bun:test";
import { editionExternalLinks } from "./edition-links";

const ids = (input: Parameters<typeof editionExternalLinks>[0]) =>
	editionExternalLinks(input).map((link) => link.id);

describe("editionExternalLinks", () => {
	test("nothing known gives nothing", () => {
		expect(editionExternalLinks({})).toEqual([]);
	});

	test("an Open Library edition with an archive copy", () => {
		const links = editionExternalLinks({
			olid: "OL123M",
			isbn13: "9780441172719",
			ocaid: "dune00herb",
		});
		expect(links.map((link) => link.id)).toEqual([
			"open_library",
			"internet_archive",
			"worldcat",
			"google_books",
		]);
		expect(links[0]?.href).toBe("https://openlibrary.org/books/OL123M");
		expect(links[1]?.href).toBe("https://archive.org/details/dune00herb");
		expect(links[2]?.href).toContain("bn%3A9780441172719");
		expect(links[3]?.href).toBe(
			"https://books.google.com/books?vid=ISBN9780441172719",
		);
	});

	test("borrowable changes the hint only", () => {
		const link = editionExternalLinks({ ocaid: "x1", borrowable: true }).find(
			(entry) => entry.id === "internet_archive",
		);
		expect(link?.hint).toBe("Free to borrow or read");
	});

	test("a member edition with only an ISBN", () => {
		expect(ids({ isbn10: "044117271X" })).toEqual([
			"open_library",
			"internet_archive_search",
			"worldcat",
			"google_books",
		]);
		const worldcat = editionExternalLinks({
			isbn13: "9780441172719",
			isbn10: "044117271X",
		}).find((link) => link.id === "worldcat");
		expect(worldcat?.href).toContain("9780441172719");
	});

	test("identifiers add their own links, ignoring junk ids", () => {
		expect(
			ids({
				goodreads: ["abc", "123"],
				librarything: ["456"],
				lccn: [" 2001 012345 "],
			}),
		).toEqual(["goodreads", "librarything", "library_of_congress"]);
		expect(ids({ goodreads: ["abc"] })).toEqual([]);
	});
});
