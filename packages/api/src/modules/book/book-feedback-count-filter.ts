import type { Database } from "@bbrc/db";

/** Book ids whose club review count falls within [min, max] (inclusive). */
export async function bookIdsWithFeedbackCountBounds(
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

	const grouped = await db.feedback.groupBy({
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

	const withFeedback = new Set(grouped.map((row) => row.bookId));
	const noFeedbackBooks = await db.book.findMany({
		where:
			withFeedback.size > 0 ? { id: { notIn: [...withFeedback] } } : undefined,
		select: { id: true },
	});

	return [...matched, ...noFeedbackBooks.map((row) => row.id)];
}
