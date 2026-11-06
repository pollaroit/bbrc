import { describe, expect, it } from "bun:test";
import { AddManualBookInputSchema } from "./book.schema";

const AUTHOR_ID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";

const valid = {
	title: "A Book Nobody Catalogued",
	publishedIn: 1987,
	authorIds: [AUTHOR_ID],
	edition: { language: "eng", pages: 214, format: "hardcover" },
};

describe("AddManualBookInputSchema", () => {
	it("accepts the work and a first edition with only the required fields", () => {
		const parsed = AddManualBookInputSchema.safeParse(valid);
		expect(parsed.success).toBe(true);
	});

	it("takes the page count from the edition, not the work", () => {
		const withWorkPages = AddManualBookInputSchema.safeParse({
			...valid,
			pages: 999,
		});
		expect(withWorkPages.success).toBe(true);
		if (withWorkPages.success) {
			expect("pages" in withWorkPages.data).toBe(false);
		}

		const noEditionPages = AddManualBookInputSchema.safeParse({
			...valid,
			edition: { language: "eng", format: "paperback" },
		});
		expect(noEditionPages.success).toBe(false);
	});

	it("needs a title, a first-published year and at least one author", () => {
		expect(
			AddManualBookInputSchema.safeParse({ ...valid, title: "" }).success,
		).toBe(false);
		expect(
			AddManualBookInputSchema.safeParse({
				...valid,
				publishedIn: undefined,
			}).success,
		).toBe(false);
		expect(
			AddManualBookInputSchema.safeParse({ ...valid, authorIds: undefined })
				.success,
		).toBe(false);
		expect(
			AddManualBookInputSchema.safeParse({
				...valid,
				authorIds: undefined,
				authors: ["Ana Quill"],
			}).success,
		).toBe(true);
	});

	it("refuses an invalid ISBN and a series that is both existing and new", () => {
		expect(
			AddManualBookInputSchema.safeParse({
				...valid,
				edition: { ...valid.edition, isbn: "12345" },
			}).success,
		).toBe(false);
		expect(
			AddManualBookInputSchema.safeParse({
				...valid,
				edition: { ...valid.edition, isbn: "978-0-306-40615-7" },
			}).success,
		).toBe(true);
		expect(
			AddManualBookInputSchema.safeParse({
				...valid,
				seriesSlug: "some-series",
				newSeries: { title: "Another" },
			}).success,
		).toBe(false);
	});
});
