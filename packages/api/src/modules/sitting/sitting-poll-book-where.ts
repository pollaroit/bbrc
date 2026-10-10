import type { Database, Prisma } from "@bbrc/db";
import { mergeWhereFragments } from "../../utils/searching";
import { resolveAuthorSlugsToNames } from "../book/book-author-filter";
import { bookIdsWithReadsCountBounds } from "../book/book-read-count-filter";
import type { CreateSittingPollInput } from "./sitting.schema";

function buildWishlistPollBookWhereBase(
	poll: CreateSittingPollInput,
): Prisma.BookWhereInput {
	return {
		status: "wishlist",
		pages:
			poll.minPages == null && poll.maxPages == null
				? undefined
				: {
						gte: poll.minPages ?? undefined,
						lte: poll.maxPages ?? undefined,
					},
		publishedIn:
			poll.minPublishedIn == null && poll.maxPublishedIn == null
				? undefined
				: {
						gte: poll.minPublishedIn ?? undefined,
						lte: poll.maxPublishedIn ?? undefined,
					},
		openLibraryRating:
			poll.minOpenLibraryRating == null
				? undefined
				: { gte: poll.minOpenLibraryRating },
		countries:
			poll.countries && poll.countries.length > 0
				? { hasSome: poll.countries }
				: undefined,
	};
}

/** Returns `null` when filters cannot match any book (e.g. unknown author slugs). */
export async function resolveWishlistPollBookWhere(
	poll: CreateSittingPollInput,
	db: Database,
): Promise<Prisma.BookWhereInput | null> {
	let resolvedAuthorNames: string[] | undefined;

	if (poll.authors && poll.authors.length > 0) {
		resolvedAuthorNames = await resolveAuthorSlugsToNames(poll.authors, db);
		if (resolvedAuthorNames.length === 0) {
			return null;
		}
	}

	const readsCountIds = await bookIdsWithReadsCountBounds(
		db,
		poll.minReads ?? undefined,
		poll.maxReads ?? undefined,
	);

	if (readsCountIds !== null && readsCountIds.length === 0) {
		return null;
	}

	const baseWhere = mergeWhereFragments<Prisma.BookWhereInput>(
		buildWishlistPollBookWhereBase(poll),
		{
			authors:
				resolvedAuthorNames && resolvedAuthorNames.length > 0
					? { hasSome: resolvedAuthorNames }
					: undefined,
		},
	);

	if (readsCountIds == null) {
		return baseWhere;
	}

	return mergeWhereFragments<Prisma.BookWhereInput>(baseWhere, {
		id: { in: readsCountIds },
	});
}
