import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import type {
	AdminDocumentOverviewOutput,
	AdminDocumentRankingItemSchema,
} from "./admin-document.schema";

type DocumentRankingItem = z.infer<typeof AdminDocumentRankingItemSchema>;

const RANKING_LIMIT = 5;

const rankingSelect = {
	slug: true,
	name: true,
	status: true,
	language: true,
	createdAt: true,
	user: { select: { username: true } },
	book: { select: { slug: true, title: true } },
} as const;

function mapDocumentRow(
	row: Prisma.DocumentGetPayload<{ select: typeof rankingSelect }>,
	metric: number,
	secondaryMetric?: number,
): DocumentRankingItem {
	return {
		slug: row.slug,
		name: row.name,
		status: row.status,
		language: row.language,
		bookSlug: row.book.slug,
		bookTitle: row.book.title,
		submitterUsername: row.user.username,
		metric,
		secondaryMetric,
	};
}

async function rankingByGroupedCount(
	db: Database,
	where: Prisma.DocumentWhereInput,
	field: "bookId" | "userId",
): Promise<DocumentRankingItem[]> {
	const grouped = await db.document.groupBy({
		by: [field],
		where,
		_count: { _all: true },
		orderBy: { _count: { [field]: "desc" } },
		take: RANKING_LIMIT,
	});

	const items: DocumentRankingItem[] = [];
	for (const row of grouped) {
		const doc = await db.document.findFirst({
			where: {
				...where,
				[field]: row[field],
			},
			orderBy: { createdAt: "desc" },
			select: rankingSelect,
		});
		if (doc) {
			items.push(mapDocumentRow(doc, row._count._all));
		}
	}
	return items;
}

export function emptyAdminDocumentRankings(): AdminDocumentOverviewOutput["rankings"] {
	return {
		oldestPending: [],
		recentlySubmitted: [],
		mostByBook: [],
		mostBySubmitter: [],
	};
}

export async function loadAdminDocumentRankings(
	db: Database,
	where: Prisma.DocumentWhereInput,
): Promise<AdminDocumentOverviewOutput["rankings"]> {
	const [oldestPending, recentlySubmitted, mostByBook, mostBySubmitter] =
		await Promise.all([
			db.document.findMany({
				where: { ...where, status: "pending" },
				orderBy: { createdAt: "asc" },
				take: RANKING_LIMIT,
				select: rankingSelect,
			}),
			db.document.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: RANKING_LIMIT,
				select: rankingSelect,
			}),
			rankingByGroupedCount(db, where, "bookId"),
			rankingByGroupedCount(db, where, "userId"),
		]);

	return {
		oldestPending: oldestPending.map((row) =>
			mapDocumentRow(row, row.createdAt.getTime()),
		),
		recentlySubmitted: recentlySubmitted.map((row) =>
			mapDocumentRow(row, row.createdAt.getTime()),
		),
		mostByBook,
		mostBySubmitter,
	};
}
