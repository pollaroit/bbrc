import type { Database, Prisma } from "@bbrc/db";
import { mergeWhereFragments } from "../../utils/searching";
import { bookListRanging } from "./book.listing";
import type { GetBookListInput } from "./book.schema";
import { resolveAuthorSlugsToNames } from "./book-author-filter";
import {
	buildBookTextSearchWhere,
	findBookIdsByAuthorNameSearch,
} from "./book-list-search";
import { bookIdsWithReadsCountBounds } from "./book-read-count-filter";
import { resolveSubjectSlugsToNames } from "./book-subject-filter";

export type BookListQueryInput = Omit<GetBookListInput, "cursor" | "limit"> & {
	limit?: number;
};

export type BuildBookListWhereOptions = {
	resolvedAuthorNames?: string[];
	resolvedSubjectNames?: string[];
	searchAuthorBookIds?: string[];
};

export function buildBookListWhere(
	input: BookListQueryInput,
	viewerUserId?: string,
	options?: BuildBookListWhereOptions,
): Prisma.BookWhereInput {
	const ranging = bookListRanging.from(input);
	const searchWhere =
		options?.searchAuthorBookIds != null
			? buildBookTextSearchWhere(input.search, options.searchAuthorBookIds)
			: buildBookTextSearchWhere(input.search, []);

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
		searchWhere,
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
			subjects:
				options?.resolvedSubjectNames && options.resolvedSubjectNames.length > 0
					? input.subjectsMatch === "all"
						? { hasEvery: options.resolvedSubjectNames }
						: { hasSome: options.resolvedSubjectNames }
					: undefined,
			countries:
				input.countries && input.countries.length > 0
					? { hasSome: input.countries }
					: undefined,
			publishedIn:
				input.minPublishedIn == null && input.maxPublishedIn == null
					? undefined
					: {
							gte: input.minPublishedIn ?? undefined,
							lte: input.maxPublishedIn ?? undefined,
						},
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
	let resolvedSubjectNames: string[] | undefined;

	if (input.authors && input.authors.length > 0) {
		resolvedAuthorNames = await resolveAuthorSlugsToNames(input.authors, db);
		if (resolvedAuthorNames.length === 0) {
			return null;
		}
	}

	if (input.subjects && input.subjects.length > 0) {
		resolvedSubjectNames = await resolveSubjectSlugsToNames(input.subjects, db);
		if (resolvedSubjectNames.length === 0) {
			return null;
		}
	}

	const readsCountIds = await bookIdsWithReadsCountBounds(
		db,
		input.minReads ?? undefined,
		input.maxReads ?? undefined,
	);

	if (readsCountIds !== null && readsCountIds.length === 0) {
		return null;
	}

	let searchAuthorBookIds: string[] | undefined;
	if (input.search?.trim()) {
		searchAuthorBookIds = await findBookIdsByAuthorNameSearch(db, input.search);
	}

	const baseWhere = buildBookListWhere(input, viewerUserId, {
		resolvedAuthorNames,
		resolvedSubjectNames,
		searchAuthorBookIds,
	});

	if (readsCountIds == null) {
		return baseWhere;
	}

	return mergeWhereFragments<Prisma.BookWhereInput>(baseWhere, {
		id: { in: readsCountIds },
	});
}
