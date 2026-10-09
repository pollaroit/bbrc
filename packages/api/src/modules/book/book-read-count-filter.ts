import type { Database } from "@bbrc/db";

/** Book ids whose member read count falls within [min, max] (inclusive). */
export async function bookIdsWithReadsCountBounds(
	db: Database,
	min?: number,
	max?: number,
): Promise<string[] | null> {
	if (min == null && max == null) {
		return null;
	}

	const effectiveMin = min ?? 0;
	const effectiveMax = max ?? Number.POSITIVE_INFINITY;

	if (effectiveMax < effectiveMin) {
		return [];
	}

	if (effectiveMax === 0) {
		const rows = await db.book.findMany({
			where: { reads: { none: {} } },
			select: { id: true },
		});
		return rows.map((row) => row.id);
	}

	const grouped = await db.read.groupBy({
		by: ["bookId"],
		_count: { _all: true },
	});

	const matched = grouped
		.filter((row) => {
			const count = row._count._all;
			return count >= effectiveMin && count <= effectiveMax;
		})
		.map((row) => row.bookId);

	if (effectiveMin > 0) {
		return matched;
	}

	const withReads = new Set(grouped.map((row) => row.bookId));
	const zeroReadBooks = await db.book.findMany({
		where: withReads.size > 0 ? { id: { notIn: [...withReads] } } : undefined,
		select: { id: true },
	});

	return [...matched, ...zeroReadBooks.map((row) => row.id)];
}
