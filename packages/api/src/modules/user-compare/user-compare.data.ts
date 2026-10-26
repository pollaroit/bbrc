import type { Database, Prisma } from "@bbrc/db";
import type { CompareRead } from "@bbrc/shared";
import type { CompareBook } from "./user-compare.schema";

type Db = Database;

export type ReadFinish = { year: number | null; month: number | null };

export type MemberReadRow = {
	bookId: string;
	rating: number | null;
	finish: ReadFinish;
};

export const compareBookSelect = {
	id: true,
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	pages: true,
	publishedIn: true,
	averageRating: true,
	subjects: true,
	countries: true,
	authorLinks: {
		orderBy: { position: "asc" },
		select: { author: { select: { id: true, slug: true, name: true } } },
	},
} as const;

type CompareBookRow = {
	id: string;
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
	pages: number;
	publishedIn: number;
	averageRating: number | null;
	authorLinks: { author: { id: string; slug: string; name: string } }[];
};

export function toCompareBook(book: CompareBookRow): CompareBook {
	return {
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		authorRefs: book.authorLinks.map((link) => link.author),
		coverId: book.coverId,
		pages: book.pages,
		publishedIn: book.publishedIn,
		averageRating: book.averageRating,
	};
}

/**
 * Every read of the given members with the rating they gave (from their review) and the
 * finish month. Two queries however many members are asked for.
 */
export async function loadMemberReads(
	db: Db,
	userIds: readonly string[],
	bookWhere?: Prisma.BookWhereInput,
): Promise<Map<string, MemberReadRow[]>> {
	const result = new Map<string, MemberReadRow[]>();
	for (const id of userIds) result.set(id, []);
	if (userIds.length === 0) return result;

	const reads = await db.read.findMany({
		where: {
			userId: { in: [...userIds] },
			...(bookWhere ? { book: bookWhere } : {}),
		},
		select: {
			userId: true,
			bookId: true,
			readEndYear: true,
			readEndMonth: true,
		},
	});
	if (reads.length === 0) return result;

	const ratings = await db.feedback.findMany({
		where: {
			authorId: { in: [...userIds] },
			bookId: { in: [...new Set(reads.map((read) => read.bookId))] },
		},
		select: { authorId: true, bookId: true, rating: true },
	});
	const ratingByKey = new Map(
		ratings.map((row) => [`${row.authorId}|${row.bookId}`, row.rating]),
	);

	for (const read of reads) {
		result.get(read.userId)?.push({
			bookId: read.bookId,
			rating: ratingByKey.get(`${read.userId}|${read.bookId}`) ?? null,
			finish: { year: read.readEndYear, month: read.readEndMonth },
		});
	}
	return result;
}

export const toCompareReads = (rows: MemberReadRow[]): CompareRead[] =>
	rows.map(({ bookId, rating }) => ({ bookId, rating }));
