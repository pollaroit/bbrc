import type { Database } from "@bbrc/db";
import { prerequisitesSatisfiedForPoll } from "../book/book-reading-prerequisites";

export type SeriesBookStatusRow = {
	position: number;
	book: { status: string };
};

export function seriesPriorBooksSatisfiedForPoll(
	memberPosition: number,
	booksInSeries: SeriesBookStatusRow[],
): boolean {
	if (memberPosition <= 1) {
		return true;
	}

	return booksInSeries
		.filter((row) => row.position < memberPosition)
		.every((row) => row.book.status === "completed");
}

export async function loadSeriesBooksStatusBySeriesId(
	seriesIds: string[],
	db: Database,
): Promise<Map<string, SeriesBookStatusRow[]>> {
	if (seriesIds.length === 0) {
		return new Map();
	}

	const rows = await db.seriesBook.findMany({
		where: { seriesId: { in: seriesIds } },
		select: {
			seriesId: true,
			position: true,
			book: { select: { status: true } },
		},
		orderBy: [{ seriesId: "asc" }, { position: "asc" }],
	});

	const map = new Map<string, SeriesBookStatusRow[]>();

	for (const row of rows) {
		const current = map.get(row.seriesId) ?? [];
		current.push({ position: row.position, book: row.book });
		map.set(row.seriesId, current);
	}

	return map;
}

type WishlistPollBookRow = {
	readAfterPrerequisites: Array<{
		prerequisiteBook: { status: string };
	}>;
	seriesMembership: {
		position: number;
		seriesId: string;
	} | null;
};

export function wishlistBookEligibleForPoll(
	book: WishlistPollBookRow,
	seriesBooksBySeriesId: Map<string, SeriesBookStatusRow[]>,
): boolean {
	const readAfterOk = prerequisitesSatisfiedForPoll(
		book.readAfterPrerequisites.map((row) => row.prerequisiteBook),
	);

	if (!readAfterOk) {
		return false;
	}

	const membership = book.seriesMembership;
	if (!membership) {
		return true;
	}

	const booksInSeries = seriesBooksBySeriesId.get(membership.seriesId) ?? [];

	return seriesPriorBooksSatisfiedForPoll(membership.position, booksInSeries);
}
