import type { Database } from "@bbrc/db";
import {
	type AuthorField,
	type AuthorFieldMeta,
	type AuthorFieldSource,
	bucketByDecade,
	cumulativeSeries,
	fillMonthSeries,
	getBookCountryName,
	monthKeyOfDate,
} from "@bbrc/shared";
import { definePagination } from "../../utils/pagination";
import { matchesSearch } from "../author-insights/insights-common";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import {
	type AdminAuthorSortField,
	bookCountBuckets,
	COVERAGE_FIELDS,
	coverageOf,
	type DashboardAuthor,
	hasLockedField,
	isFieldFilled,
	matchesDashboardFilters,
	sortDashboardAuthors,
	sourcesByField,
	sourceTotals,
} from "./author-dashboard.helpers";
import type {
	AdminAuthorListInput,
	AdminAuthorListOutput,
	AdminAuthorOverviewOutput,
	AdminAuthorScopeInput,
	AdminAuthorStatsOutput,
} from "./author-dashboard.schema";
import { findMergeSuggestions } from "./merge-suggestions";

const RANKING_LIMIT = 10;
const NATIONALITY_LIMIT = 15;
const FAILURE_LIMIT = 10;
const DAYS_IN_CHART = 30;

/**
 * Loads every author with the counts the dashboards need, in four queries. At the size of the club
 * (hundreds of authors, thousands of reads) filtering and sorting in memory is simpler and fast;
 * the counts of readers and reads need a join no `orderBy` can express.
 */
export async function loadDashboardAuthors(
	db: Database,
): Promise<DashboardAuthor[]> {
	const [authors, links, reads] = await Promise.all([
		db.author.findMany({
			select: {
				id: true,
				slug: true,
				name: true,
				sortName: true,
				bio: true,
				birthYear: true,
				deathYear: true,
				birthPlace: true,
				deathPlace: true,
				nationalities: true,
				gender: true,
				wikipediaUrl: true,
				goodreadsUrl: true,
				websiteUrl: true,
				photoUrl: true,
				wikidataId: true,
				openLibraryId: true,
				status: true,
				enrichmentStatus: true,
				enrichmentAttempts: true,
				enrichmentError: true,
				fieldMeta: true,
				createdAt: true,
				updatedAt: true,
				enrichedAt: true,
				aliases: { select: { alias: true } },
				_count: { select: { followers: true } },
			},
		}),
		db.bookAuthor.findMany({ select: { authorId: true, bookId: true } }),
		db.read.findMany({
			where: { user: visibleOnSiteUserWhere },
			select: { userId: true, bookId: true },
		}),
	]);

	const booksByAuthor = new Map<string, string[]>();
	for (const link of links) {
		const list = booksByAuthor.get(link.authorId) ?? [];
		list.push(link.bookId);
		booksByAuthor.set(link.authorId, list);
	}
	const readersByBook = new Map<string, string[]>();
	for (const read of reads) {
		const list = readersByBook.get(read.bookId) ?? [];
		list.push(read.userId);
		readersByBook.set(read.bookId, list);
	}

	return authors.map((author) => {
		const bookIds = booksByAuthor.get(author.id) ?? [];
		const readers = new Set<string>();
		let readCount = 0;
		for (const bookId of bookIds) {
			for (const userId of readersByBook.get(bookId) ?? []) {
				readers.add(userId);
				readCount += 1;
			}
		}
		return {
			id: author.id,
			slug: author.slug,
			name: author.name,
			sortName: author.sortName,
			bio: author.bio,
			birthYear: author.birthYear,
			deathYear: author.deathYear,
			birthPlace: author.birthPlace,
			deathPlace: author.deathPlace,
			nationalities: author.nationalities,
			gender: author.gender,
			wikipediaUrl: author.wikipediaUrl,
			goodreadsUrl: author.goodreadsUrl,
			websiteUrl: author.websiteUrl,
			photoUrl: author.photoUrl,
			wikidataId: author.wikidataId,
			openLibraryId: author.openLibraryId,
			status: author.status,
			enrichmentStatus: author.enrichmentStatus,
			enrichmentAttempts: author.enrichmentAttempts,
			enrichmentError: author.enrichmentError,
			fieldMeta: (author.fieldMeta ?? {}) as AuthorFieldMeta,
			aliases: author.aliases.map((row) => row.alias),
			createdAt: author.createdAt,
			updatedAt: author.updatedAt,
			enrichedAt: author.enrichedAt,
			bookCount: bookIds.length,
			readerCount: readers.size,
			readCount,
			followerCount: author._count.followers,
		};
	});
}

/** Applies filters, the date range and the search to the loaded authors. */
export function scopeAuthors(
	all: readonly DashboardAuthor[],
	input: AdminAuthorScopeInput | AdminAuthorListInput,
): DashboardAuthor[] {
	const rangeBy = input.rangeBy ?? "createdAt";
	return all.filter((author) => {
		if (!matchesDashboardFilters(author, input)) return false;
		if (input.rangeMin || input.rangeMax) {
			const value = author[rangeBy];
			if (!value) return false;
			if (input.rangeMin && value < input.rangeMin) return false;
			if (input.rangeMax && value > input.rangeMax) return false;
		}
		return matchesSearch(
			input.search,
			author.name,
			author.slug,
			author.sortName,
			...author.aliases,
		);
	});
}

function buildAdditionsByDay(rows: { createdAt: Date }[], days: number) {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);
	const counts = new Map<string, number>();
	for (let i = 0; i < days; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		counts.set(day.toISOString().slice(0, 10), 0);
	}
	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts.entries()].map(([date, count]) => ({ date, count }));
}

function countBy<T>(items: readonly T[], key: (item: T) => string | null) {
	const counts = new Map<string, number>();
	for (const item of items) {
		const value = key(item);
		if (value == null) continue;
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return counts;
}

function nationalityCounts(authors: readonly DashboardAuthor[], limit: number) {
	const counts = new Map<string, number>();
	for (const author of authors) {
		for (const code of author.nationalities) {
			counts.set(code, (counts.get(code) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([alpha2, count]) => ({
			alpha2,
			name: getBookCountryName(alpha2) ?? alpha2,
			count,
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		.slice(0, limit);
}

const GENDERS = ["female", "male", "non_binary", "other", "unknown"] as const;

function genderCounts(authors: readonly DashboardAuthor[]) {
	const counts = countBy(authors, (author) => author.gender);
	return GENDERS.map((gender) => ({ gender, count: counts.get(gender) ?? 0 }));
}

function ranking(
	authors: readonly DashboardAuthor[],
	metric: (author: DashboardAuthor) => number,
	secondary?: (author: DashboardAuthor) => number,
) {
	return authors
		.filter((author) => metric(author) > 0)
		.toSorted((a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name))
		.slice(0, RANKING_LIMIT)
		.map((author) => ({
			slug: author.slug,
			name: author.name,
			photoUrl: author.photoUrl,
			metric: metric(author),
			...(secondary ? { secondaryMetric: secondary(author) } : {}),
		}));
}

function mergeSuggestionCount(all: readonly DashboardAuthor[]): number {
	return findMergeSuggestions(
		all.map((author) => ({
			id: author.id,
			name: author.name,
			wikidataId: author.wikidataId,
			openLibraryId: author.openLibraryId,
			verified: author.status === "verified",
			aliases: author.aliases,
		})),
	).length;
}

// ── Overview ───────────────────────────────────────────────────────────────

export async function getAdminAuthorOverview(
	input: AdminAuthorScopeInput,
	db: Database,
): Promise<AdminAuthorOverviewOutput> {
	const all = await loadDashboardAuthors(db);
	const authors = scopeAuthors(all, input);

	const now = Date.now();
	const addedSince = (days: number) =>
		authors.filter(
			(author) => now - author.createdAt.getTime() <= days * 86_400_000,
		).length;
	const statusCount = (status: DashboardAuthor["status"]) =>
		authors.filter((author) => author.status === status).length;
	const enrichmentCount = (status: DashboardAuthor["enrichmentStatus"]) =>
		authors.filter((author) => author.enrichmentStatus === status).length;

	const rows = sourcesByField(authors);
	const sourceTotalsValue = sourceTotals(rows);

	const monthCounts = countBy(authors, (author) =>
		monthKeyOfDate(author.createdAt),
	);
	const lastMonths = fillMonthSeries(monthCounts).slice(-12);

	return {
		kpis: {
			totalAuthors: authors.length,
			publicAuthors: authors.filter((author) => author.bookCount > 0).length,
			withoutBooks: authors.filter((author) => author.bookCount === 0).length,
			verified: statusCount("verified"),
			auto: statusCount("auto"),
			needsReview: statusCount("needs_review"),
			enrichment: {
				pending: enrichmentCount("pending"),
				running: enrichmentCount("running"),
				done: enrichmentCount("done"),
				failed: enrichmentCount("failed"),
			},
			withPhoto: authors.filter((author) => isFieldFilled(author, "photo"))
				.length,
			withBio: authors.filter((author) => isFieldFilled(author, "bio")).length,
			lockedAuthors: authors.filter((author) => hasLockedField(author)).length,
			aiFilledAuthors: authors.filter((author) =>
				COVERAGE_FIELDS.some(
					(field) =>
						isFieldFilled(author, field) &&
						author.fieldMeta[field]?.source === "ai",
				),
			).length,
			followersTotal: authors.reduce(
				(sum, author) => sum + author.followerCount,
				0,
			),
			addedLast7Days: addedSince(7),
			addedLast30Days: addedSince(30),
			mergeSuggestions: mergeSuggestionCount(all),
		},
		additionsByDay: buildAdditionsByDay(authors, DAYS_IN_CHART),
		additionsByMonth: lastMonths,
		coverage: coverageOf(authors),
		sourcesByField: rows,
		sourceTotals: sourceTotalsValue,
		distributions: {
			nationalities: nationalityCounts(authors, 12),
			genders: genderCounts(authors),
			birthDecades: bucketByDecade(authors.map((author) => author.birthYear)),
		},
		rankings: {
			byBooks: ranking(
				authors,
				(author) => author.bookCount,
				(author) => author.readerCount,
			),
			byReaders: ranking(
				authors,
				(author) => author.readerCount,
				(author) => author.bookCount,
			),
			byReads: ranking(
				authors,
				(author) => author.readCount,
				(author) => author.readerCount,
			),
			byFollowers: ranking(
				authors,
				(author) => author.followerCount,
				(author) => author.bookCount,
			),
		},
		enrichmentFailures: authors
			.filter((author) => author.enrichmentStatus === "failed")
			.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.slice(0, FAILURE_LIMIT)
			.map((author) => ({
				slug: author.slug,
				name: author.name,
				attempts: author.enrichmentAttempts,
				error: author.enrichmentError,
				updatedAt: author.updatedAt,
			})),
	};
}

// ── List ───────────────────────────────────────────────────────────────────

export async function listAdminAuthors(
	input: AdminAuthorListInput,
	db: Database,
): Promise<AdminAuthorListOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const all = await loadDashboardAuthors(db);
	const sorted = sortDashboardAuthors(
		scopeAuthors(all, input),
		(input.sortBy ?? "createdAt") as AdminAuthorSortField,
		input.sortDirection ?? "desc",
	);
	const page = sorted.slice(
		pagination.skip,
		pagination.skip + pagination.limit,
	);

	return pagination.paginate(
		page.map((author) => {
			const sources = new Set<AuthorFieldSource>();
			for (const field of COVERAGE_FIELDS) {
				const source = author.fieldMeta[field]?.source;
				if (source && isFieldFilled(author, field)) sources.add(source);
			}
			return {
				id: author.id,
				slug: author.slug,
				name: author.name,
				sortName: author.sortName,
				status: author.status,
				enrichmentStatus: author.enrichmentStatus,
				enrichmentAttempts: author.enrichmentAttempts,
				enrichmentError: author.enrichmentError,
				photoUrl: author.photoUrl,
				nationalities: author.nationalities,
				gender: author.gender,
				birthYear: author.birthYear,
				deathYear: author.deathYear,
				bookCount: author.bookCount,
				readerCount: author.readerCount,
				readCount: author.readCount,
				followerCount: author.followerCount,
				aliasCount: author.aliases.length,
				missingFields: COVERAGE_FIELDS.filter(
					(field) => !isFieldFilled(author, field),
				) as AuthorField[],
				sources: [...sources],
				hasLocks: hasLockedField(author),
				createdAt: author.createdAt,
				updatedAt: author.updatedAt,
				enrichedAt: author.enrichedAt,
			};
		}),
		sorted.length,
	);
}

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getAdminAuthorStats(
	input: AdminAuthorScopeInput,
	db: Database,
): Promise<AdminAuthorStatsOutput> {
	const all = await loadDashboardAuthors(db);
	const authors = scopeAuthors(all, input);
	const ids = new Set(authors.map((author) => author.id));

	const follows =
		ids.size === 0
			? []
			: await db.follow.findMany({
					where: { authorId: { in: [...ids] } },
					select: { createdAt: true },
				});

	const rows = sourcesByField(authors);
	const totals = sourceTotals(rows);

	const statusCounts = countBy(authors, (author) => author.status);
	const enrichmentCounts = countBy(
		authors,
		(author) => author.enrichmentStatus,
	);

	const attempts = countBy(authors, (author) =>
		String(author.enrichmentAttempts),
	);

	const enrichedMonths = countBy(
		authors.filter(
			(author) => author.enrichmentStatus === "done" && author.enrichedAt,
		),
		(author) => (author.enrichedAt ? monthKeyOfDate(author.enrichedAt) : null),
	);

	const backlog = new Map<string, { needsReview: number; auto: number }>();
	for (const author of authors) {
		if (author.status === "verified") continue;
		const key = monthKeyOfDate(author.createdAt);
		const entry = backlog.get(key) ?? { needsReview: 0, auto: 0 };
		if (author.status === "needs_review") entry.needsReview += 1;
		else entry.auto += 1;
		backlog.set(key, entry);
	}
	const backlogMonths = fillMonthSeries(
		new Map([...backlog.keys()].map((key) => [key, 0])),
	).map((point) => ({
		month: point.month,
		needsReview: backlog.get(point.month)?.needsReview ?? 0,
		auto: backlog.get(point.month)?.auto ?? 0,
	}));

	return {
		statusDistribution: (["verified", "auto", "needs_review"] as const).map(
			(status) => ({ status, count: statusCounts.get(status) ?? 0 }),
		),
		enrichmentDistribution: (
			["pending", "running", "done", "failed"] as const
		).map((status) => ({ status, count: enrichmentCounts.get(status) ?? 0 })),
		additionsByDay: buildAdditionsByDay(authors, DAYS_IN_CHART),
		additionsByMonth: cumulativeSeries(
			fillMonthSeries(
				countBy(authors, (author) => monthKeyOfDate(author.createdAt)),
			),
		),
		coverage: coverageOf(authors),
		sourcesByField: rows,
		sourceTotals: totals,
		aiVersusSources: {
			ai: totals.ai,
			sourced: totals.openlibrary + totals.wikidata + totals.wikipedia,
			admin: totals.admin,
			unknown: totals.unknown,
		},
		nationalities: nationalityCounts(authors, NATIONALITY_LIMIT),
		genders: genderCounts(authors),
		birthDecades: bucketByDecade(authors.map((author) => author.birthYear)),
		booksPerAuthor: bookCountBuckets(authors.map((author) => author.bookCount)),
		attemptsDistribution: [...attempts.entries()]
			.map(([value, count]) => ({ attempts: Number(value), count }))
			.sort((a, b) => a.attempts - b.attempts),
		enrichedPerMonth: fillMonthSeries(enrichedMonths),
		reviewBacklogByMonth: backlogMonths,
		followerGrowth: cumulativeSeries(
			fillMonthSeries(
				countBy(follows, (follow) => monthKeyOfDate(follow.createdAt)),
			),
		),
		totals: {
			authors: authors.length,
			enrichmentFailed: enrichmentCounts.get("failed") ?? 0,
			reviewQueue:
				(statusCounts.get("needs_review") ?? 0) +
				(statusCounts.get("auto") ?? 0),
			mergeSuggestions: mergeSuggestionCount(all),
			followers: follows.length,
		},
	};
}
