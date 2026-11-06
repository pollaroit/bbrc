import { describe, expect, it } from "bun:test";
import { deleteBookEdition } from "./book-edition.service";

const admin = { id: "admin-1", role: "admin" };

type Owner = {
	source: "manual" | "open_library";
	primaryEditionId: string | null;
	editions: Array<{
		id: string;
		status: "member" | "verified";
		createdAt: Date;
	}>;
};

/** A database holding one edition ("e1") of a book; records what the delete changes. */
function fakeDb(owner: Owner) {
	const bookUpdates: Array<Record<string, unknown>> = [];
	const row = {
		id: "e1",
		publicId: "abc",
		openLibraryOlid: null,
		bookId: "book-1",
		title: null,
		language: "eng",
		pages: 300,
		isbn13: null,
		isbn10: null,
		publisher: null,
		publishedYear: null,
		format: "paperback",
		translator: null,
		coverUrl: null,
		notes: null,
		status: "verified",
		createdAt: new Date("2026-01-01"),
		verifiedAt: null,
		createdById: "admin-1",
		createdBy: null,
		primaryForBook: owner.primaryEditionId === "e1" ? { id: "book-1" } : null,
		_count: { reads: 0, readings: 0 },
	};
	const tx = {
		bookEdition: {
			findUnique: async () => row,
			delete: async () => ({}),
		},
		reading: { updateMany: async () => ({}) },
		read: { updateMany: async () => ({}) },
		editionTombstone: { upsert: async () => ({}) },
		book: {
			findUnique: async () => ({
				source: owner.source,
				coverId: null,
				customCoverUrl: null,
				primaryEdition: { pages: 111, coverUrl: null },
			}),
			update: async ({ data }: { data: Record<string, unknown> }) => {
				bookUpdates.push(data);
				return {};
			},
			findFirst: async () => null,
		},
	};
	const db = {
		bookEdition: { findUnique: async () => row },
		book: { findUnique: async () => owner },
		reading: { count: async () => 0 },
		$transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
	};
	return { db: db as never, bookUpdates };
}

describe("deleteBookEdition on a book added by hand", () => {
	it("refuses to delete the only edition", async () => {
		const { db, bookUpdates } = fakeDb({
			source: "manual",
			primaryEditionId: "e1",
			editions: [
				{ id: "e1", status: "verified", createdAt: new Date("2026-01-01") },
			],
		});
		await expect(deleteBookEdition(db, admin, "e1")).rejects.toThrow(
			"at least one edition",
		);
		expect(bookUpdates).toHaveLength(0);
	});

	it("hands the primary role to the oldest verified edition and re-syncs the book", async () => {
		const { db, bookUpdates } = fakeDb({
			source: "manual",
			primaryEditionId: "e1",
			editions: [
				{ id: "e1", status: "verified", createdAt: new Date("2026-01-01") },
				{ id: "e2", status: "member", createdAt: new Date("2026-01-02") },
				{ id: "e3", status: "verified", createdAt: new Date("2026-01-03") },
			],
		});
		await deleteBookEdition(db, admin, "e1");
		expect(bookUpdates[0]).toEqual({ primaryEditionId: "e3" });
		// The book then copies its pages from the new primary edition.
		expect(bookUpdates[1]).toMatchObject({ pages: 111 });
	});

	it("does not touch the primary edition when another edition is deleted", async () => {
		const { db, bookUpdates } = fakeDb({
			source: "manual",
			primaryEditionId: "e2",
			editions: [
				{ id: "e1", status: "verified", createdAt: new Date("2026-01-01") },
				{ id: "e2", status: "verified", createdAt: new Date("2026-01-02") },
			],
		});
		await deleteBookEdition(db, admin, "e1");
		expect(bookUpdates).toHaveLength(0);
	});

	it("lets an Open Library book lose its last member edition", async () => {
		const { db, bookUpdates } = fakeDb({
			source: "open_library",
			primaryEditionId: null,
			editions: [
				{ id: "e1", status: "member", createdAt: new Date("2026-01-01") },
			],
		});
		await deleteBookEdition(db, admin, "e1");
		expect(bookUpdates).toHaveLength(0);
	});
});
