import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { contentPlainText } from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import { fetchEditionExportMetadataBatch } from "../../lib/open-library/work-editions";
import {
	type BookListQueryInput,
	buildBookListWhereWithAuthors,
} from "../book/book-list-where";
import {
	compareUserReadRatings,
	userReadListSorting,
	withStableUserReadOrderBy,
} from "./read.listing";
import type {
	ExportUserReadsInput,
	ExportUserReadsOutput,
} from "./read-export.schema";

function buildExportUserReadSelect(memberUserId: string) {
	return {
		readEndYear: true,
		readEndMonth: true,
		editionId: true,
		createdAt: true,
		book: {
			select: {
				slug: true,
				title: true,
				authors: true,
				status: true,
				pages: true,
				publishedIn: true,
				olid: true,
				averageRating: true,
				openLibraryRating: true,
				feedbacks: {
					where: { authorId: memberUserId },
					select: {
						rating: true,
						review: true,
						isSpoiler: true,
					},
					take: 1,
				},
			},
		},
	} as const satisfies Prisma.ReadSelect;
}

type ExportUserReadRow = Prisma.ReadGetPayload<{
	select: ReturnType<typeof buildExportUserReadSelect>;
}>;

function mapExportRow(
	row: ExportUserReadRow,
	editionById: Map<
		string,
		{
			isbn13: string | null;
			isbn10: string | null;
			publisher: string | null;
			binding: string | null;
		}
	>,
): ExportUserReadsOutput["items"][number] {
	const feedback = row.book.feedbacks[0];
	const editionMeta = row.editionId
		? editionById.get(row.editionId)
		: undefined;

	return {
		title: row.book.title,
		authors: row.book.authors,
		slug: row.book.slug,
		olid: row.book.olid,
		status: row.book.status,
		pages: row.book.pages,
		publishedIn: row.book.publishedIn,
		averageRating: row.book.averageRating,
		openLibraryRating: row.book.openLibraryRating,
		readEndYear: row.readEndYear,
		readEndMonth: row.readEndMonth,
		editionId: row.editionId,
		recordedAt: row.createdAt,
		myRating: feedback?.rating ?? null,
		myReview: feedback?.review
			? contentPlainText(feedback.review).trim() || null
			: null,
		isSpoiler: feedback?.isSpoiler ?? false,
		isbn13: editionMeta?.isbn13 ?? null,
		isbn10: editionMeta?.isbn10 ?? null,
		publisher: editionMeta?.publisher ?? null,
		binding: editionMeta?.binding ?? null,
	};
}

export async function exportUserReads(
	input: ExportUserReadsInput,
	db: Database,
	session: Session | null = null,
): Promise<ExportUserReadsOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!user) {
		throw appError("NOT_FOUND", "read.memberNotFound", {
			data: { username: input.username },
		});
	}

	const bookWhere = await buildBookListWhereWithAuthors(
		input as BookListQueryInput,
		db,
	);

	if (bookWhere == null) {
		return { count: 0, items: [] };
	}

	const viewerId = session?.user?.id;
	const mutualOnly = Boolean(input.mutualOnly && viewerId);

	if (input.mutualOnly && !viewerId) {
		throw appError("UNAUTHORIZED", "read.signInForMutualReads");
	}

	const bookFilter: Prisma.BookWhereInput =
		mutualOnly && viewerId
			? {
					AND: [
						bookWhere,
						{
							reads: {
								some: { userId: viewerId },
							},
						},
					],
				}
			: bookWhere;

	const readWhere = {
		userId: user.id,
		book: bookFilter,
	};

	const sorting = userReadListSorting.from(input);
	const take = input.limit ?? 5000;

	const readSelect = buildExportUserReadSelect(user.id);
	const byRating = sorting.sortBy === "rating";
	const fetched = await db.read.findMany({
		where: readWhere,
		orderBy: withStableUserReadOrderBy(sorting.use(), sorting.sortDirection),
		select: readSelect,
		// Rating order is applied in memory, so every row is needed first.
		...(byRating ? {} : { take }),
	});
	const rows = byRating
		? fetched
				.toSorted((a, b) =>
					compareUserReadRatings(
						{
							bookId: a.book.slug,
							rating: a.book.feedbacks[0]?.rating ?? null,
						},
						{
							bookId: b.book.slug,
							rating: b.book.feedbacks[0]?.rating ?? null,
						},
						sorting.sortDirection,
					),
				)
				.slice(0, take)
		: fetched;

	const editionIds = rows
		.map((row) => row.editionId)
		.filter((id): id is string => id != null);

	const editionById = await fetchEditionExportMetadataBatch(editionIds);

	return {
		count: rows.length,
		items: rows.map((row) => mapExportRow(row, editionById)),
	};
}
