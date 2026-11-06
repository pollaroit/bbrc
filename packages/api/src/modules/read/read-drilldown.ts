import type { Database, Prisma } from "@bbrc/db";
import { canonicalSubjectKey } from "@bbrc/shared";

/*
 * The filters a stats chart can open the reads page with: when a read was finished and a
 * subject as the stats group it (several Open Library tags can be one subject).
 */

const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

export function parseFinishedMonth(
	value: string | undefined,
): { year: number; month: number } | null {
	const match = value ? YEAR_MONTH.exec(value) : null;
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	return month >= 1 && month <= 12 ? { year, month } : null;
}

/** Reads finished from one month to another, inclusive; undated reads never match. */
export function finishedRangeWhere(
	from: string | undefined,
	to: string | undefined,
): Prisma.ReadWhereInput {
	const start = parseFinishedMonth(from);
	const end = parseFinishedMonth(to);
	if (!start && !end) return {};
	const and: Prisma.ReadWhereInput[] = [
		{ readEndYear: { not: null }, readEndMonth: { not: null } },
	];
	if (start) {
		and.push({
			OR: [
				{ readEndYear: { gt: start.year } },
				{ readEndYear: start.year, readEndMonth: { gte: start.month } },
			],
		});
	}
	if (end) {
		and.push({
			OR: [
				{ readEndYear: { lt: end.year } },
				{ readEndYear: end.year, readEndMonth: { lte: end.month } },
			],
		});
	}
	return { AND: and };
}

/** The books of a member that carry a subject, as the stats group subjects (see `canonicalSubjectKey`). */
export async function bookIdsWithCanonicalSubject(
	db: Database,
	userId: string,
	subjectKey: string,
): Promise<string[]> {
	const key = subjectKey.trim().toLowerCase();
	const rows = await db.read.findMany({
		where: { userId },
		select: { bookId: true, book: { select: { subjects: true } } },
	});
	return rows
		.filter((row) =>
			row.book.subjects.some((subject) => canonicalSubjectKey(subject) === key),
		)
		.map((row) => row.bookId);
}
