import type { Database, Prisma } from "@bbrc/db";
import type zod from "zod";
import { mergeWhereFragments } from "../../utils/searching";
import { BookListQueryInputSchema } from "../book/book.schema";
import { buildBookListWhereWithAuthors } from "../book/book-list-where";
import type { authorActivityFiltersSchema } from "./author.schema";

type ActivityFilters = zod.infer<typeof authorActivityFiltersSchema>;

/** The books of one author. */
export const byAuthor = (authorId: string) =>
	({ authorLinks: { some: { authorId } } }) satisfies Prisma.BookWhereInput;

/** The last millisecond of the day a date falls on (UTC), so a "to" bound includes that day. */
export function endOfDay(date: Date): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			23,
			59,
			59,
			999,
		),
	);
}

/** `createdAt` bounds from two dates (the whole `to` day counts); undefined when neither is set. */
export function dayRangeWhere(
	from: Date | undefined,
	to: Date | undefined,
): Prisma.DateTimeFilter | undefined {
	if (!from && !to) return undefined;
	return {
		...(from ? { gte: from } : {}),
		...(to ? { lte: endOfDay(to) } : {}),
	};
}

/**
 * Read end date bounds. A read stores a year and a month (the month may be unknown), so a
 * read with only a year matches any month of that year, and a read with no year never matches.
 */
export function readEndRangeWhere(
	from: Date | undefined,
	to: Date | undefined,
): Prisma.ReadWhereInput | undefined {
	const clauses: Prisma.ReadWhereInput[] = [];
	if (from) {
		const year = from.getUTCFullYear();
		const month = from.getUTCMonth() + 1;
		clauses.push({
			OR: [
				{ readEndYear: { gt: year } },
				{ readEndYear: year, readEndMonth: { gte: month } },
				{ readEndYear: year, readEndMonth: null },
			],
		});
	}
	if (to) {
		const year = to.getUTCFullYear();
		const month = to.getUTCMonth() + 1;
		clauses.push({
			OR: [
				{ readEndYear: { lt: year } },
				{ readEndYear: year, readEndMonth: { lte: month } },
				{ readEndYear: year, readEndMonth: null },
			],
		});
	}
	return clauses.length > 0 ? { AND: clauses } : undefined;
}

/** Sorting by the finish date: reads with no date always go last, in both directions. */
export function readFinishedOrderBy(
	direction: "asc" | "desc",
): Prisma.ReadOrderByWithRelationInput[] {
	return [
		{ readEndYear: { sort: direction, nulls: "last" } },
		{ readEndMonth: { sort: direction, nulls: "last" } },
	];
}

/** Text a member search matches: display name and username. */
export function memberSearchWhere(query: string): Prisma.UserWhereInput {
	return {
		OR: [
			{ name: { contains: query, mode: "insensitive" } },
			{ username: { contains: query, mode: "insensitive" } },
		],
	};
}

/** Text a book search matches: title, slug, and the title or slug of its series. */
export function bookSearchWhere(query: string): Prisma.BookWhereInput {
	return {
		OR: [
			{ title: { contains: query, mode: "insensitive" } },
			{ slug: { contains: query, mode: "insensitive" } },
			{
				seriesMembership: {
					series: {
						OR: [
							{ title: { contains: query, mode: "insensitive" } },
							{ slug: { contains: query, mode: "insensitive" } },
						],
					},
				},
			},
		],
	};
}

/**
 * The book part of a reads or reviews query: the author's books narrowed by the book
 * filters, the picked books and series. Returns null when a filter can match nothing.
 */
export async function buildScopedBookWhere(
	db: Database,
	authorId: string,
	filters: Pick<
		ActivityFilters,
		| "books"
		| "series"
		| "subjects"
		| "subjectsMatch"
		| "countries"
		| "minPages"
		| "maxPages"
		| "minPublishedIn"
		| "maxPublishedIn"
		| "minAverageRating"
		| "maxAverageRating"
	>,
	viewerUserId?: string,
): Promise<Prisma.BookWhereInput | null> {
	const listWhere = await buildBookListWhereWithAuthors(
		BookListQueryInputSchema.parse({
			subjects: filters.subjects,
			subjectsMatch: filters.subjectsMatch,
			countries: filters.countries,
			minPages: filters.minPages,
			maxPages: filters.maxPages,
			minPublishedIn: filters.minPublishedIn,
			maxPublishedIn: filters.maxPublishedIn,
			minAverageRating: filters.minAverageRating,
			maxAverageRating: filters.maxAverageRating,
		}),
		db,
		viewerUserId,
	);
	if (listWhere == null) return null;

	const picked: Prisma.BookWhereInput[] = [];
	if (filters.books?.length) picked.push({ slug: { in: filters.books } });
	if (filters.series?.length) {
		picked.push({
			seriesMembership: { series: { slug: { in: filters.series } } },
		});
	}
	return mergeWhereFragments<Prisma.BookWhereInput>(
		byAuthor(authorId),
		listWhere,
		...picked,
	);
}

/** Members picked by username when asked (what the viewer may see is decided by the reads/reviews where-helpers). */
export function scopedMemberWhere(
	members: readonly string[] | undefined,
): Prisma.UserWhereInput {
	return members?.length ? { username: { in: [...members] } } : {};
}
