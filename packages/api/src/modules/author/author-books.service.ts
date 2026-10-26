import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import { subjectNameToSlug } from "@bbrc/shared";
import { getBookList } from "../book/book.service";
import { listCountryFacetsForBooks } from "../book/book-country-filter";
import { buildBookListWhereWithAuthors } from "../book/book-list-where";
import { viewerFromSession } from "../user/user-visibility";
import type {
	AuthorBookFacetsInput,
	AuthorBookFacetsOutput,
	AuthorBooksInput,
	AuthorBooksOutput,
} from "./author.schema";
import { resolveAuthor } from "./author-resolve";

const SUBJECT_FACET_LIMIT = 80;

/** Books by the author through the very same list `/books` uses, with the author fixed. */
export async function getAuthorBooks(
	input: AuthorBooksInput,
	db: Database,
	session: Session | null,
): Promise<AuthorBooksOutput> {
	const viewer = viewerFromSession(session);
	const author = await resolveAuthor(db, input.slug, viewer);
	const { slug: _slug, ...listInput } = input;

	const page = await getBookList(
		{ ...listInput, authors: [author.slug] },
		db,
		viewer?.userId,
	);

	const readSlugs = new Set<string>();
	if (viewer && page.items.length > 0) {
		const reads = await db.read.findMany({
			where: {
				userId: viewer.userId,
				book: { slug: { in: page.items.map((item) => item.slug) } },
			},
			select: { book: { select: { slug: true } } },
		});
		for (const read of reads) readSlugs.add(read.book.slug);
	}

	return {
		items: page.items.map((item) => ({
			...item,
			readByMe: readSlugs.has(item.slug),
		})),
		metadata: page.metadata,
	};
}

export async function getAuthorBookFacets(
	input: AuthorBookFacetsInput,
	db: Database,
	session: Session | null,
): Promise<AuthorBookFacetsOutput> {
	const viewer = viewerFromSession(session);
	const author = await resolveAuthor(db, input.slug, viewer);
	const { slug: _slug, pinnedCountryCodes, ...listInput } = input;

	// Each facet ignores its own filter so the options stay pickable.
	const [countryWhere, subjectWhere, allBooks] = await Promise.all([
		buildBookListWhereWithAuthors(
			{ ...listInput, countries: undefined, authors: [author.slug] },
			db,
			viewer?.userId,
		),
		buildBookListWhereWithAuthors(
			{
				...listInput,
				subjects: undefined,
				subjectsMatch: undefined,
				authors: [author.slug],
			},
			db,
			viewer?.userId,
		),
		db.book.findMany({
			where: { authorLinks: { some: { authorId: author.id } } },
			select: { pages: true, publishedIn: true },
		}),
	]);

	const countries = countryWhere
		? await listCountryFacetsForBooks(
				db,
				countryWhere,
				pinnedCountryCodes ?? [],
			)
		: [];

	const subjectCounts = new Map<string, { name: string; bookCount: number }>();
	if (subjectWhere) {
		const rows = await db.book.findMany({
			where: subjectWhere,
			select: { subjects: true },
		});
		for (const row of rows) {
			const seen = new Set<string>();
			for (const raw of row.subjects) {
				const name = raw.trim();
				const slug = subjectNameToSlug(name);
				if (!slug || seen.has(slug)) continue;
				seen.add(slug);
				const entry = subjectCounts.get(slug) ?? { name, bookCount: 0 };
				entry.bookCount += 1;
				subjectCounts.set(slug, entry);
			}
		}
	}
	const subjects = [...subjectCounts.entries()]
		.map(([slug, entry]) => ({ slug, ...entry }))
		.toSorted(
			(a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name),
		)
		.slice(0, SUBJECT_FACET_LIMIT);

	return { countries, subjects, ranges: rangesOf(allBooks) };
}

/** Min and max of the slider fields over the author's books. */
export function rangesOf(
	books: readonly { pages: number; publishedIn: number }[],
): AuthorBookFacetsOutput["ranges"] {
	if (books.length === 0) return { pages: null, publishedIn: null };
	const pages = books.map((book) => book.pages);
	const years = books.map((book) => book.publishedIn);
	return {
		pages: { min: Math.min(...pages), max: Math.max(...pages) },
		publishedIn: { min: Math.min(...years), max: Math.max(...years) },
	};
}
