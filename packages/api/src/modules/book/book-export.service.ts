import type { Database, Prisma } from "@bbrc/db";
import { bookListSorting } from "./book.listing";
import type {
	ExportBookListInput,
	ExportBookListOutput,
} from "./book-export.schema";
import { buildBookListWhere } from "./book-list-where";

const exportBookSelect = {
	title: true,
	authors: true,
	status: true,
	averageRating: true,
	openLibraryRating: true,
	pages: true,
	publishedIn: true,
	slug: true,
	olid: true,
	excerpt: true,
	subjects: true,
	subjectPeople: true,
	subjectTimes: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			feedbacks: true,
			favorites: true,
		},
	},
} as const satisfies Prisma.BookSelect;

type ExportBookRow = Prisma.BookGetPayload<{ select: typeof exportBookSelect }>;

function withStableSlugOrderBy(
	orderBy: Prisma.BookOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.BookOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

function mapExportRow(
	row: ExportBookRow,
): ExportBookListOutput["items"][number] {
	return {
		title: row.title,
		authors: row.authors,
		status: row.status,
		averageRating: row.averageRating,
		openLibraryRating: row.openLibraryRating,
		pages: row.pages,
		publishedIn: row.publishedIn,
		slug: row.slug,
		olid: row.olid,
		excerpt: row.excerpt,
		subjects: row.subjects ?? [],
		subjectPeople: row.subjectPeople ?? [],
		subjectTimes: row.subjectTimes ?? [],
		feedbackCount: row._count.feedbacks,
		favoriteCount: row._count.favorites,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function exportBookList(
	input: ExportBookListInput,
	db: Database,
	viewerUserId?: string,
): Promise<ExportBookListOutput> {
	const sorting = bookListSorting.from(input);
	const where = buildBookListWhere(input, viewerUserId);
	const take = input.limit ?? 5000;

	const rows = await db.book.findMany({
		where,
		orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
		select: exportBookSelect,
		take,
	});

	return {
		count: rows.length,
		items: rows.map(mapExportRow),
	};
}
