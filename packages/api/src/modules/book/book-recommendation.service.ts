import type { Database } from "@bbrc/db";

/** Every Open Library work id already in the library. */
export async function listCatalogOlids(db: Database): Promise<string[]> {
	const rows = await db.book.findMany({ select: { olid: true } });
	return rows.map((row) => row.olid);
}
