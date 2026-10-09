import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type AdminShelfListFilters,
	adminShelfListRanging,
	adminShelfListSearching,
	adminShelfListSorting,
} from "./admin-shelf.listing";
import type {
	AdminShelfOverviewOutput,
	GetAdminShelfOverviewInput,
	GetAdminShelfStatsInput,
	GetAdminShelfStatsOutput,
	ListAdminShelvesInput,
	ListAdminShelvesOutput,
} from "./admin-shelf.schema";
import { adminShelfListSelect } from "./admin-shelf.schema";
import {
	emptyAdminShelfRankings,
	loadAdminShelfRankings,
} from "./admin-shelf-rankings";

type AdminShelfListQueryInput =
	| GetAdminShelfOverviewInput
	| ListAdminShelvesInput
	| GetAdminShelfStatsInput;

function buildAdditionsByDay(
	rows: { createdAt: Date }[],
	days: number,
): { date: string; count: number }[] {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);

	const countsByDay = new Map<string, number>();
	for (let i = 0; i < days; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		countsByDay.set(day.toISOString().slice(0, 10), 0);
	}

	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (countsByDay.has(key)) {
			countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
		}
	}

	return [...countsByDay.entries()].map(([date, count]) => ({ date, count }));
}

async function shelfIdsWithMinBooks(
	db: Database,
	min: number,
): Promise<string[]> {
	const rows = await db.shelfBook.groupBy({
		by: ["shelfId"],
		_count: { _all: true },
		having: { shelfId: { _count: { gte: min } } },
	});
	return rows.map((row) => row.shelfId);
}

async function shelfIdsWithMinPostAttachments(
	db: Database,
	min: number,
): Promise<string[]> {
	const rows = await db.shelf.findMany({
		select: { id: true, _count: { select: { postAttachments: true } } },
	});
	return rows
		.filter((row) => row._count.postAttachments >= min)
		.map((row) => row.id);
}

function intersectIds(
	current: string[] | null,
	next: string[],
): string[] | null {
	if (next.length === 0) {
		return [];
	}
	if (current === null) {
		return next;
	}
	const allowed = new Set(next);
	return current.filter((id) => allowed.has(id));
}

async function resolveShelfIdFilters(
	db: Database,
	input: AdminShelfListFilters,
): Promise<string[] | null> {
	let ids: string[] | null = null;

	if (input.minBooks != null && input.minBooks > 0) {
		const matched = await shelfIdsWithMinBooks(db, input.minBooks);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	if (input.minPostAttachments != null && input.minPostAttachments > 0) {
		const matched = await shelfIdsWithMinPostAttachments(
			db,
			input.minPostAttachments,
		);
		if (matched.length === 0) {
			return [];
		}
		ids = intersectIds(ids, matched);
	}

	return ids;
}

function adminShelfExtraWhere(
	input: AdminShelfListFilters,
): Prisma.ShelfWhereInput {
	const parts: Prisma.ShelfWhereInput[] = [];

	if (input.statuses?.length) {
		parts.push({ status: { in: input.statuses } });
	}
	if (input.types?.length) {
		parts.push({ type: { in: input.types } });
	}
	if (input.ownerUsernames?.length) {
		parts.push({ user: { username: { in: input.ownerUsernames } } });
	}
	if (input.hasCoverImage === true) {
		parts.push({ coverImageUrl: { not: null } });
	}
	if (input.hasCoverImage === false) {
		parts.push({ coverImageUrl: null });
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminShelfListWhere(
	input: AdminShelfListQueryInput,
	db: Database,
): Promise<{ where: Prisma.ShelfWhereInput | null; empty: boolean }> {
	const ranging = adminShelfListRanging.from(input);
	const searching = adminShelfListSearching.from(input);
	const idFilter = await resolveShelfIdFilters(db, input);

	if (idFilter?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.ShelfWhereInput>(
		ranging.use(),
		searching.use(),
		adminShelfExtraWhere(input),
		{
			id: idFilter ? { in: idFilter } : undefined,
		},
	);

	return { where, empty: false };
}

function mapAdminShelfListRow(
	row: Prisma.ShelfGetPayload<{ select: typeof adminShelfListSelect }>,
) {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description,
		coverImageUrl: row.coverImageUrl,
		status: row.status,
		type: row.type,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		owner: row.user,
		counts: {
			books: row._count.books,
			postAttachments: row._count.postAttachments,
		},
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.ShelfOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.ShelfOrderByWithRelationInput[] {
	return [orderBy, { user: { username: "asc" } }, { slug: sortDirection }];
}

export async function listAdminShelves(
	input: ListAdminShelvesInput,
	db: Database,
): Promise<ListAdminShelvesOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminShelfListSorting.from(input);

	const { where, empty } = await buildAdminShelfListWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.shelf.count({ where }),
		db.shelf.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminShelfListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminShelfListRow), total);
}

function emptyAdminShelfOverview(): AdminShelfOverviewOutput {
	return {
		kpis: {
			totalShelves: 0,
			active: 0,
			draft: 0,
			archived: 0,
			withCoverOverride: 0,
			orderedType: 0,
			distinctOwners: 0,
			totalBooksOnShelves: 0,
			createdLast7Days: 0,
			createdLast30Days: 0,
		},
		shelvesByDay: buildAdditionsByDay([], 30),
		rankings: emptyAdminShelfRankings(),
	};
}

export async function getAdminShelfOverview(
	input: GetAdminShelfOverviewInput,
	db: Database,
): Promise<AdminShelfOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where, empty } = await buildAdminShelfListWhere(input, db);
	if (empty || where === null) {
		return emptyAdminShelfOverview();
	}

	const shelves = await db.shelf.findMany({
		where,
		select: {
			status: true,
			type: true,
			coverImageUrl: true,
			userId: true,
			createdAt: true,
			_count: { select: { books: true } },
		},
	});

	const ownerIds = new Set<string>();
	let active = 0;
	let draft = 0;
	let archived = 0;
	let withCoverOverride = 0;
	let orderedType = 0;
	let totalBooksOnShelves = 0;
	let createdLast7Days = 0;
	let createdLast30Days = 0;

	for (const row of shelves) {
		ownerIds.add(row.userId);
		totalBooksOnShelves += row._count.books;
		if (row.coverImageUrl) {
			withCoverOverride += 1;
		}
		if (row.type === "ordered") {
			orderedType += 1;
		}
		if (row.status === "active") {
			active += 1;
		} else if (row.status === "draft") {
			draft += 1;
		} else {
			archived += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			createdLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			createdLast30Days += 1;
		}
	}

	const rankings = await loadAdminShelfRankings(db, where);

	return {
		kpis: {
			totalShelves: shelves.length,
			active,
			draft,
			archived,
			withCoverOverride,
			orderedType,
			distinctOwners: ownerIds.size,
			totalBooksOnShelves,
			createdLast7Days,
			createdLast30Days,
		},
		shelvesByDay: buildAdditionsByDay(shelves, 30),
		rankings,
	};
}

function booksPerShelfBucket(count: number): string {
	if (count === 0) {
		return "Empty";
	}
	if (count <= 5) {
		return "1–5 books";
	}
	if (count <= 15) {
		return "6–15 books";
	}
	return "16+ books";
}

export async function getAdminShelfStats(
	input: GetAdminShelfStatsInput,
	db: Database,
): Promise<GetAdminShelfStatsOutput> {
	const { where, empty } = await buildAdminShelfListWhere(input, db);
	if (empty || where === null) {
		return {
			statusDistribution: [],
			typeDistribution: [],
			shelvesByDay: buildAdditionsByDay([], 30),
			booksPerShelfHistogram: [],
			engagementFunnel: [],
		};
	}

	const shelves = await db.shelf.findMany({
		where,
		select: {
			status: true,
			type: true,
			createdAt: true,
			coverImageUrl: true,
			_count: { select: { books: true, postAttachments: true } },
		},
	});

	const statusCounts = { active: 0, draft: 0, archived: 0 };
	const typeCounts = { ordered: 0, unordered: 0 };
	const booksHistogram = new Map<string, number>();
	let withBooks = 0;
	let withAttachments = 0;
	let withCover = 0;

	for (const row of shelves) {
		statusCounts[row.status] += 1;
		typeCounts[row.type] += 1;
		const bucket = booksPerShelfBucket(row._count.books);
		booksHistogram.set(bucket, (booksHistogram.get(bucket) ?? 0) + 1);
		if (row._count.books > 0) {
			withBooks += 1;
		}
		if (row._count.postAttachments > 0) {
			withAttachments += 1;
		}
		if (row.coverImageUrl) {
			withCover += 1;
		}
	}

	const total = shelves.length;

	return {
		statusDistribution: (["active", "draft", "archived"] as const).map(
			(status) => ({
				status,
				count: statusCounts[status],
			}),
		),
		typeDistribution: (["ordered", "unordered"] as const).map((type) => ({
			type,
			count: typeCounts[type],
		})),
		shelvesByDay: buildAdditionsByDay(shelves, 30),
		booksPerShelfHistogram: [...booksHistogram.entries()].map(
			([label, value]) => ({
				label,
				value,
			}),
		),
		engagementFunnel: [
			{ stage: "All shelves", count: total },
			{ stage: "With books", count: withBooks },
			{ stage: "Quoted in posts", count: withAttachments },
			{ stage: "Custom cover", count: withCover },
		],
	};
}
