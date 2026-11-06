import type { Database } from "@bbrc/db";

/** Every Open Library work id already in the library (manual books have none). */
export async function listCatalogOlids(db: Database): Promise<string[]> {
	const rows = await db.book.findMany({
		where: { olid: { not: null } },
		select: { olid: true },
	});
	return rows.flatMap((row) => (row.olid ? [row.olid] : []));
}
