import type { Database, Prisma } from "@bbrc/db";

const AUTHOR_BOOK_ID_LIMIT = 500;

export async function findBookIdsByAuthorNameSearch(
	db: Database,
	query: string,
): Promise<string[]> {
	const pattern = `%${query.trim()}%`;
	if (pattern === "%%") {
		return [];
	}

	const rows = await db.$queryRaw<{ id: string }[]>`
		SELECT DISTINCT b.id
		FROM book b
		WHERE EXISTS (
			SELECT 1 FROM unnest(b.authors) AS author_name(name)
			WHERE author_name.name ILIKE ${pattern}
		)
		LIMIT ${AUTHOR_BOOK_ID_LIMIT}
	`;

	return rows.map((row) => row.id);
}

export function buildBookTextSearchWhere(
	query: string | undefined,
	authorBookIds: string[],
): Prisma.BookWhereInput {
	const trimmed = query?.trim();
	if (!trimmed) {
		return {};
	}

	const clauses: Prisma.BookWhereInput[] = [
		{ title: { contains: trimmed, mode: "insensitive" } },
		{ slug: { contains: trimmed, mode: "insensitive" } },
	];

	if (authorBookIds.length > 0) {
		clauses.push({ id: { in: authorBookIds } });
	}

	if (clauses.length === 1) {
		return clauses[0] as Prisma.BookWhereInput;
	}

	return { OR: clauses };
}
