import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type shelfListFiltersSchema,
	shelfListRanging,
	shelfListSearching,
} from "./shelf.listing";

type ShelfListFilters = z.infer<typeof shelfListFiltersSchema>;

async function shelfIdsWithMinBooks(
	minBooks: number,
	db: Database,
): Promise<string[]> {
	const rows = await db.shelfBook.groupBy({
		by: ["shelfId"],
		_count: { _all: true },
		having: {
			shelfId: {
				_count: {
					gte: minBooks,
				},
			},
		},
	});

	return rows.map((row) => row.shelfId);
}

export async function buildPublicShelfListWhere(
	input: ShelfListFilters,
	db: Database,
): Promise<Prisma.ShelfWhereInput> {
	const ranging = shelfListRanging.from(input);
	const searching = shelfListSearching.from(input);

	let minBooksIds: string[] | undefined;
	if (input.minBooks != null && input.minBooks > 0) {
		minBooksIds = await shelfIdsWithMinBooks(input.minBooks, db);
	}

	return mergeWhereFragments<Prisma.ShelfWhereInput>(
		{ status: "active" },
		ranging.use(),
		searching.use(),
		{
			type: input.types?.length ? { in: input.types } : undefined,
			id:
				minBooksIds != null
					? minBooksIds.length > 0
						? { in: minBooksIds }
						: { in: [] }
					: undefined,
		},
	);
}
