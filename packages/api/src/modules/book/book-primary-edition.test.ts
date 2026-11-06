import { describe, expect, it } from "bun:test";
import { syncBookFromPrimaryEdition } from "./book-primary-edition";

type Row = {
	source: "manual" | "open_library";
	coverId: number | null;
	customCoverUrl: string | null;
	primaryEdition: { pages: number; coverUrl: string | null } | null;
};

/** A database with one book row; records what was written to it. */
function fakeDb(row: Row | null) {
	const updates: Array<Record<string, unknown>> = [];
	const db = {
		book: {
			findUnique: async () => row,
			findFirst: async () => null,
			update: async ({ data }: { data: Record<string, unknown> }) => {
				updates.push(data);
				return {};
			},
		},
	};
	return { db: db as never, updates };
}

describe("syncBookFromPrimaryEdition", () => {
	it("copies the pages and a new cover from the primary edition", async () => {
		const { db, updates } = fakeDb({
			source: "manual",
			coverId: null,
			customCoverUrl: null,
			primaryEdition: {
				pages: 320,
				coverUrl: "https://r2/books/editions/a.webp",
			},
		});
		await syncBookFromPrimaryEdition(db, "book-1");
		expect(updates).toHaveLength(1);
		expect(updates[0]?.pages).toBe(320);
		expect(updates[0]?.customCoverUrl).toBe("https://r2/books/editions/a.webp");
		expect(Number(updates[0]?.coverId)).toBeLessThan(0);
	});

	it("keeps the cover id when the file is the same, so caches stay valid", async () => {
		const { db, updates } = fakeDb({
			source: "manual",
			coverId: -42,
			customCoverUrl: "https://r2/books/editions/a.webp",
			primaryEdition: {
				pages: 100,
				coverUrl: "https://r2/books/editions/a.webp",
			},
		});
		await syncBookFromPrimaryEdition(db, "book-1");
		expect(updates[0]).toMatchObject({ pages: 100, coverId: -42 });
	});

	it("clears the cover when the primary edition has none", async () => {
		const { db, updates } = fakeDb({
			source: "manual",
			coverId: -42,
			customCoverUrl: "https://r2/books/editions/a.webp",
			primaryEdition: { pages: 100, coverUrl: null },
		});
		await syncBookFromPrimaryEdition(db, "book-1");
		expect(updates[0]).toEqual({
			pages: 100,
			customCoverUrl: null,
			coverId: null,
		});
	});

	it("leaves Open Library books and books without a primary edition alone", async () => {
		for (const row of [
			{
				source: "open_library" as const,
				coverId: 5,
				customCoverUrl: null,
				primaryEdition: { pages: 1, coverUrl: null },
			},
			{
				source: "manual" as const,
				coverId: null,
				customCoverUrl: null,
				primaryEdition: null,
			},
			null,
		]) {
			const { db, updates } = fakeDb(row);
			await syncBookFromPrimaryEdition(db, "book-1");
			expect(updates).toHaveLength(0);
		}
	});
});
