import type { Database, Prisma } from "@bbrc/db";
import { DOCUMENT_LANGUAGE_CODES } from "@bbrc/shared";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	type AdminDocumentListFilters,
	adminDocumentListRanging,
	adminDocumentListSearching,
	adminDocumentListSorting,
} from "./admin-document.listing";
import type {
	AdminDocumentOverviewOutput,
	GetAdminDocumentOverviewInput,
	GetAdminDocumentStatsInput,
	GetAdminDocumentStatsOutput,
	ListAdminDocumentsInput,
	ListAdminDocumentsOutput,
} from "./admin-document.schema";
import { adminDocumentListSelect } from "./admin-document.schema";
import { loadAdminDocumentRankings } from "./admin-document-rankings";

type AdminDocumentListQueryInput =
	| GetAdminDocumentOverviewInput
	| ListAdminDocumentsInput
	| GetAdminDocumentStatsInput;

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

function adminDocumentExtraWhere(
	input: AdminDocumentListFilters,
): Prisma.DocumentWhereInput {
	const parts: Prisma.DocumentWhereInput[] = [];

	if (input.statuses?.length) {
		parts.push({ status: { in: input.statuses } });
	}
	if (input.languages?.length) {
		parts.push({ language: { in: input.languages } });
	}
	if (input.bookSlugs?.length) {
		parts.push({ book: { slug: { in: input.bookSlugs } } });
	}
	if (input.submitterUsernames?.length) {
		parts.push({ user: { username: { in: input.submitterUsernames } } });
	}
	if (input.hasAcceptanceNotes === true) {
		parts.push({ acceptanceNotes: { not: null } });
	}
	if (input.hasAcceptanceNotes === false) {
		parts.push({ acceptanceNotes: null });
	}
	if (input.hasRejectionReason === true) {
		parts.push({ rejectionReason: { not: null } });
	}
	if (input.hasRejectionReason === false) {
		parts.push({ rejectionReason: null });
	}

	return mergeWhereFragments(...parts);
}

export async function buildAdminDocumentListWhere(
	input: AdminDocumentListQueryInput,
): Promise<{ where: Prisma.DocumentWhereInput; empty: boolean }> {
	const ranging = adminDocumentListRanging.from(input);
	const searching = adminDocumentListSearching.from(input);

	const where = mergeWhereFragments<Prisma.DocumentWhereInput>(
		ranging.use(),
		searching.use(),
		adminDocumentExtraWhere(input),
	);

	return { where, empty: false };
}

function mapAdminDocumentListRow(
	row: Prisma.DocumentGetPayload<{ select: typeof adminDocumentListSelect }>,
) {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		language: row.language,
		status: row.status,
		acceptanceNotes: row.acceptanceNotes,
		rejectionReason: row.rejectionReason,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		submitter: row.user,
		book: row.book,
	};
}

function withStableSlugOrderBy(
	orderBy: Prisma.DocumentOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.DocumentOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

export async function listAdminDocuments(
	input: ListAdminDocumentsInput,
	db: Database,
): Promise<ListAdminDocumentsOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminDocumentListSorting.from(input);

	const { where } = await buildAdminDocumentListWhere(input);

	const [total, rows] = await Promise.all([
		db.document.count({ where }),
		db.document.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: adminDocumentListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminDocumentListRow), total);
}

export async function getAdminDocumentOverview(
	input: GetAdminDocumentOverviewInput,
	db: Database,
): Promise<AdminDocumentOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);

	const { where } = await buildAdminDocumentListWhere(input);

	const documents = await db.document.findMany({
		where,
		select: {
			status: true,
			bookId: true,
			userId: true,
			acceptanceNotes: true,
			rejectionReason: true,
			createdAt: true,
		},
	});

	const bookIds = new Set<string>();
	const submitterIds = new Set<string>();
	let pending = 0;
	let approved = 0;
	let rejected = 0;
	let withAcceptanceNotes = 0;
	let withRejectionReason = 0;
	let submittedLast7Days = 0;
	let submittedLast30Days = 0;

	for (const row of documents) {
		bookIds.add(row.bookId);
		submitterIds.add(row.userId);
		if (row.status === "pending") {
			pending += 1;
		} else if (row.status === "approved") {
			approved += 1;
		} else {
			rejected += 1;
		}
		if (row.acceptanceNotes) {
			withAcceptanceNotes += 1;
		}
		if (row.rejectionReason) {
			withRejectionReason += 1;
		}
		if (row.createdAt >= sevenDaysAgo) {
			submittedLast7Days += 1;
		}
		if (row.createdAt >= thirtyDaysAgo) {
			submittedLast30Days += 1;
		}
	}

	const rankings = await loadAdminDocumentRankings(db, where);

	return {
		kpis: {
			totalDocuments: documents.length,
			pending,
			approved,
			rejected,
			distinctBooks: bookIds.size,
			distinctSubmitters: submitterIds.size,
			withAcceptanceNotes,
			withRejectionReason,
			submittedLast7Days,
			submittedLast30Days,
		},
		documentsByDay: buildAdditionsByDay(documents, 30),
		rankings,
	};
}

export async function getAdminDocumentStats(
	input: GetAdminDocumentStatsInput,
	db: Database,
): Promise<GetAdminDocumentStatsOutput> {
	const { where } = await buildAdminDocumentListWhere(input);

	const documents = await db.document.findMany({
		where,
		select: {
			status: true,
			language: true,
			createdAt: true,
			acceptanceNotes: true,
			rejectionReason: true,
		},
	});

	const statusCounts = { pending: 0, approved: 0, rejected: 0 };
	const languageCounts = new Map<string, number>();
	let withNotes = 0;
	let withRejection = 0;

	for (const row of documents) {
		statusCounts[row.status] += 1;
		languageCounts.set(
			row.language,
			(languageCounts.get(row.language) ?? 0) + 1,
		);
		if (row.acceptanceNotes) {
			withNotes += 1;
		}
		if (row.rejectionReason) {
			withRejection += 1;
		}
	}

	const total = documents.length;

	return {
		statusDistribution: (["pending", "approved", "rejected"] as const).map(
			(status) => ({
				status,
				count: statusCounts[status],
			}),
		),
		languageMix: DOCUMENT_LANGUAGE_CODES.flatMap((language) => {
			const count = languageCounts.get(language) ?? 0;
			return count > 0 ? [{ language, count }] : [];
		}),
		documentsByDay: buildAdditionsByDay(documents, 30),
		reviewFunnel: [
			{ stage: "All submissions", count: total },
			{ stage: "Pending", count: statusCounts.pending },
			{ stage: "Approved", count: statusCounts.approved },
			{ stage: "Rejected", count: statusCounts.rejected },
			{ stage: "With acceptance notes", count: withNotes },
			{ stage: "With rejection reason", count: withRejection },
		],
	};
}
