import type { Database, Prisma } from "@bbrc/db";
import { mergeWhereFragments } from "../../utils/searching";
import { bookListRanging, bookListSearching } from "./book.listing";
import type { GetBookListInput } from "./book.schema";
import { resolveAuthorSlugsToNames } from "./book-author-filter";

export type BookListQueryInput = Omit<GetBookListInput, "cursor" | "limit"> & {
	limit?: number;
};

export type BuildBookListWhereOptions = {
	resolvedAuthorNames?: string[];
};

export function buildBookListWhere(
	input: BookListQueryInput,
	viewerUserId?: string,
	options?: BuildBookListWhereOptions,
): Prisma.BookWhereInput {
	const ranging = bookListRanging.from(input);
	const searching = bookListSearching.from(input);

	const viewerFragments: Prisma.BookWhereInput[] = [];

	if (viewerUserId && input.viewerRead === "read") {
		viewerFragments.push({
			reads: {
				some: { userId: viewerUserId },
			},
		});
	}

	if (viewerUserId && input.viewerRead === "unread") {
		viewerFragments.push({
			NOT: {
				reads: {
					some: { userId: viewerUserId },
				},
			},
		});
	}

	if (viewerUserId && input.viewerFavorite) {
		viewerFragments.push({
			favorites: {
				some: { userId: viewerUserId },
			},
		});
	}

	if (viewerUserId && input.viewerReviewed) {
		viewerFragments.push({
			feedbacks: {
				some: { authorId: viewerUserId },
			},
		});
	}

	return mergeWhereFragments<Prisma.BookWhereInput>(
		ranging.use(),
		searching.use(),
		{
			status: input.statuses ? { in: input.statuses } : undefined,
			openLibraryRating:
				input.minOpenLibraryRating == null && input.maxOpenLibraryRating == null
					? undefined
					: {
							gte: input.minOpenLibraryRating ?? undefined,
							lte: input.maxOpenLibraryRating ?? undefined,
						},
			pages:
				input.minPages == null && input.maxPages == null
					? undefined
					: {
							gte: input.minPages ?? undefined,
							lte: input.maxPages ?? undefined,
						},
			authors:
				options?.resolvedAuthorNames && options.resolvedAuthorNames.length > 0
					? { hasSome: options.resolvedAuthorNames }
					: undefined,
		},
		...viewerFragments,
	);
}

/** Returns `null` when author slugs match no catalog names (empty list). */
export async function buildBookListWhereWithAuthors(
	input: BookListQueryInput,
	db: Database,
	viewerUserId?: string,
): Promise<Prisma.BookWhereInput | null> {
	let resolvedAuthorNames: string[] | undefined;

	if (input.authors && input.authors.length > 0) {
		resolvedAuthorNames = await resolveAuthorSlugsToNames(input.authors, db);
		if (resolvedAuthorNames.length === 0) {
			return null;
		}
	}

	return buildBookListWhere(input, viewerUserId, { resolvedAuthorNames });
}
