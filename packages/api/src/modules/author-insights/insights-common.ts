import type { Prisma } from "@bbrc/db";

export const byAuthor = (authorId: string) =>
	({ authorLinks: { some: { authorId } } }) satisfies Prisma.BookWhereInput;

export const memberRefSelect = {
	select: { username: true, name: true, image: true },
} as const;

export const bookRefSelect = {
	slug: true,
	title: true,
	authors: true,
	coverId: true,
} as const;

export function bookRef(book: {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
}) {
	return {
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		coverId: book.coverId,
	};
}

export function parseOffsetCursor(cursor: string | undefined): number {
	const parsed = cursor ? Number.parseInt(cursor, 10) : 0;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Pages an in-memory list with the offset cursor the author tabs use. */
export function pageInMemory<T>(
	items: readonly T[],
	cursor: string | undefined,
	limit: number,
) {
	const skip = parseOffsetCursor(cursor);
	const page = items.slice(skip, skip + limit);
	const hasNextPage = skip + page.length < items.length;
	return {
		items: page,
		metadata: {
			limit,
			hasNextPage,
			hasPreviousPage: skip > 0,
			nextCursor: hasNextPage ? String(skip + page.length) : null,
			...(skip === 0 ? { total: items.length } : {}),
		},
	};
}

/** Case- and accent-insensitive contains, for in-memory search. */
export function normalizeSearch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

export function matchesSearch(
	query: string | undefined,
	...fields: (string | null | undefined)[]
): boolean {
	if (!query) return true;
	const needle = normalizeSearch(query);
	if (!needle) return true;
	return fields.some(
		(field) => field && normalizeSearch(field).includes(needle),
	);
}

/** Whether `value` falls inside the optional bounds. */
export function inRange(
	value: Date,
	min: Date | undefined,
	max: Date | undefined,
): boolean {
	if (min && value < min) return false;
	if (max && value > max) return false;
	return true;
}
