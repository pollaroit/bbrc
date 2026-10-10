import type { Database, Prisma } from "@bbrc/db";
import { getBookCountryName } from "@bbrc/shared";

export type BookCountryFacet = {
	alpha2: string;
	name: string;
	bookCount: number;
};

export function aggregateCountryBookCounts(
	rows: { countries: string[] }[],
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const row of rows) {
		const seenOnBook = new Set<string>();
		for (const raw of row.countries) {
			const code = raw.trim().toUpperCase();
			if (!code || seenOnBook.has(code)) {
				continue;
			}
			seenOnBook.add(code);
			counts.set(code, (counts.get(code) ?? 0) + 1);
		}
	}

	return counts;
}

export async function listCountryFacetsForBooks(
	db: Database,
	where: Prisma.BookWhereInput,
	pinnedAlpha2: string[] = [],
): Promise<BookCountryFacet[]> {
	const rows = await db.book.findMany({
		where,
		select: { countries: true },
	});

	const counts = aggregateCountryBookCounts(rows);
	const byCode = new Map<string, BookCountryFacet>();

	for (const [alpha2, bookCount] of counts) {
		byCode.set(alpha2, {
			alpha2,
			name: getBookCountryName(alpha2) ?? alpha2,
			bookCount,
		});
	}

	for (const alpha2 of pinnedAlpha2) {
		const code = alpha2.toUpperCase();
		if (!byCode.has(code)) {
			byCode.set(code, {
				alpha2: code,
				name: getBookCountryName(code) ?? code,
				bookCount: 0,
			});
		}
	}

	return [...byCode.values()].toSorted((a, b) => {
		if (b.bookCount !== a.bookCount) {
			return b.bookCount - a.bookCount;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
}
