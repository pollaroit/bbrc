import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import type {
	AdminShelfOverviewOutput,
	AdminShelfRankingItemSchema,
} from "./admin-shelf.schema";

type ShelfRankingItem = z.infer<typeof AdminShelfRankingItemSchema>;

const RANKING_LIMIT = 5;

const rankingSelect = {
	slug: true,
	title: true,
	status: true,
	type: true,
	updatedAt: true,
	user: { select: { username: true } },
	_count: { select: { books: true, postAttachments: true } },
} as const;

function mapShelfRow(
	row: Prisma.ShelfGetPayload<{ select: typeof rankingSelect }>,
	metric: number,
	secondaryMetric?: number,
): ShelfRankingItem {
	return {
		slug: row.slug,
		title: row.title,
		status: row.status,
		type: row.type,
		ownerUsername: row.user.username,
		metric,
		secondaryMetric,
	};
}

export function emptyAdminShelfRankings(): AdminShelfOverviewOutput["rankings"] {
	return {
		mostBooks: [],
		mostPostAttachments: [],
		recentlyUpdated: [],
		emptyShelves: [],
		largestActive: [],
	};
}

export async function loadAdminShelfRankings(
	db: Database,
	where: Prisma.ShelfWhereInput,
): Promise<AdminShelfOverviewOutput["rankings"]> {
	const [
		mostBooks,
		mostPostAttachments,
		recentlyUpdated,
		emptyShelves,
		largestActive,
	] = await Promise.all([
		db.shelf.findMany({
			where,
			orderBy: { books: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.shelf.findMany({
			where,
			orderBy: { postAttachments: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.shelf.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.shelf.findMany({
			where: { ...where, books: { none: {} } },
			orderBy: { updatedAt: "desc" },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
		db.shelf.findMany({
			where: { ...where, status: "active" },
			orderBy: { books: { _count: "desc" } },
			take: RANKING_LIMIT,
			select: rankingSelect,
		}),
	]);

	return {
		mostBooks: mostBooks.map((row) =>
			mapShelfRow(row, row._count.books, row._count.postAttachments),
		),
		mostPostAttachments: mostPostAttachments.map((row) =>
			mapShelfRow(row, row._count.postAttachments, row._count.books),
		),
		recentlyUpdated: recentlyUpdated.map((row) =>
			mapShelfRow(row, row.updatedAt.getTime(), row._count.books),
		),
		emptyShelves: emptyShelves.map((row) => mapShelfRow(row, 0)),
		largestActive: largestActive.map((row) =>
			mapShelfRow(row, row._count.books, row._count.postAttachments),
		),
	};
}
