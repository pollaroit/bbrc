import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";

export type BookDbClient = Database | Prisma.TransactionClient;

export type BookReadAfterSummary = {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

export const readAfterBookInclude = {
	orderBy: [{ position: "asc" }, { createdAt: "asc" }],
	select: {
		prerequisiteBook: {
			select: {
				slug: true,
				title: true,
				authors: true,
				coverId: true,
			},
		},
	},
} satisfies Prisma.Book$readAfterPrerequisitesArgs;

export function mapReadAfterBooks(
	rows: Array<{ prerequisiteBook: BookReadAfterSummary }>,
): BookReadAfterSummary[] {
	return rows.map((row) => row.prerequisiteBook);
}

export function prerequisitesSatisfiedForPoll(
	prerequisites: Array<{ status: string }>,
): boolean {
	return prerequisites.every((book) => book.status === "completed");
}

async function dependentBookIdsRequiringPrerequisite(
	prerequisiteBookId: string,
	db: BookDbClient,
): Promise<string[]> {
	const rows = await db.bookReadingPrerequisite.findMany({
		where: { prerequisiteBookId },
		select: { bookId: true },
	});

	return rows.map((row) => row.bookId);
}

async function wouldCreatePrerequisiteCycle(
	bookId: string,
	prerequisiteBookIds: string[],
	db: BookDbClient,
): Promise<boolean> {
	const visited = new Set<string>();
	const stack = [...prerequisiteBookIds];

	while (stack.length > 0) {
		const current = stack.pop();
		if (current == null) {
			continue;
		}

		if (current === bookId) {
			return true;
		}

		if (visited.has(current)) {
			continue;
		}

		visited.add(current);

		const dependents = await dependentBookIdsRequiringPrerequisite(current, db);
		stack.push(...dependents);
	}

	return false;
}

export async function resolveReadAfterBookSlugs(
	slugs: string[],
	db: BookDbClient,
): Promise<Array<{ id: string; slug: string }>> {
	const uniqueSlugs = [...new Set(slugs)];

	if (uniqueSlugs.length !== slugs.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Read-after books must not include duplicates",
		});
	}

	if (uniqueSlugs.length === 0) {
		return [];
	}

	const books = await db.book.findMany({
		where: { slug: { in: uniqueSlugs } },
		select: { id: true, slug: true },
	});

	if (books.length !== uniqueSlugs.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more read-after books were not found in the catalog",
		});
	}

	const bySlug = new Map(books.map((book) => [book.slug, book]));

	return uniqueSlugs.flatMap((slug) => {
		const book = bySlug.get(slug);
		return book ? [book] : [];
	});
}

export async function syncBookReadAfterPrerequisites(
	bookId: string,
	readAfterBookSlugs: string[],
	db: BookDbClient,
): Promise<void> {
	const resolved = await resolveReadAfterBookSlugs(readAfterBookSlugs, db);

	for (const prereq of resolved) {
		if (prereq.id === bookId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "A book cannot require itself as a prior read",
			});
		}
	}

	const prerequisiteIds = resolved.map((book) => book.id);

	if (await wouldCreatePrerequisiteCycle(bookId, prerequisiteIds, db)) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Read-after order would create a cycle. Check earlier books in the series.",
		});
	}

	await db.bookReadingPrerequisite.deleteMany({
		where: { bookId },
	});

	if (resolved.length === 0) {
		return;
	}

	await db.bookReadingPrerequisite.createMany({
		data: resolved.map((book, index) => ({
			bookId,
			prerequisiteBookId: book.id,
			position: index,
		})),
	});
}
