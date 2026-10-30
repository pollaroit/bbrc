import type { Database, Prisma } from "@bbrc/db";
import {
	AUTHOR_FIELD_SOURCE_LABELS,
	getBookCountryName,
	readProgress,
	type Viewer,
} from "@bbrc/shared";
import { mergeWhereFragments } from "../../utils/searching";
import type {
	AuthorAboutOutput,
	AuthorCard,
	AuthorGetOutput,
	AuthorListInput,
	AuthorListOutput,
	AuthorNationalityFacetsInput,
	AuthorNationalityFacetsOutput,
} from "./author.schema";
import {
	type AuthorAggregate,
	type AuthorCardRow,
	authorCardSelect,
	authorProfileSelect,
	averageRatingOf,
	buildAuthorProfile,
	EMPTY_AGGREGATE,
	loadAuthorAggregates,
	loadFollowInfo,
	loadViewerReadBookIds,
	pageInMemory,
	parseFieldMeta,
	toAuthorCard,
} from "./author-data";
import {
	authorDirectorySearching,
	authorDirectorySorting,
} from "./author-directory.listing";
import { actorOf, resolveAuthor } from "./author-resolve";
import { loadAuthorSeries, seriesSummaryLine } from "./author-series";

// ── Directory ──────────────────────────────────────────────────────────────

type DirectoryFilters = Omit<
	AuthorListInput,
	"cursor" | "limit" | "sortBy" | "sortDirection"
>;

type DirectoryEntry = {
	row: AuthorCardRow;
	aggregate: AuthorAggregate;
	followerCount: number;
	followedByMe: boolean;
};

function dbWhere(
	filters: DirectoryFilters,
	isAdmin: boolean,
): Prisma.AuthorWhereInput {
	const searching = authorDirectorySearching.from({ search: filters.search });
	const clauses: Prisma.AuthorWhereInput[] = [searching.use()];
	if (filters.genders?.length)
		clauses.push({ gender: { in: filters.genders } });
	if (filters.hasPhoto != null) {
		clauses.push(
			filters.hasPhoto ? { photoUrl: { not: null } } : { photoUrl: null },
		);
	}
	if (isAdmin && filters.statuses?.length) {
		clauses.push({ status: { in: filters.statuses } });
	}
	// Authors without books are for admins only.
	if (!(isAdmin && filters.includeEmpty)) {
		clauses.push({ books: { some: {} } });
	}
	return mergeWhereFragments<Prisma.AuthorWhereInput>(...clauses);
}

function inRange(value: number, min?: number, max?: number) {
	return (min == null || value >= min) && (max == null || value <= max);
}

/** Authors matching the filters, with their numbers (nationality filter applied separately for the facets). */
async function loadDirectory(
	db: Database,
	filters: DirectoryFilters,
	actor: { userId: string; isAdmin: boolean } | null,
	options: { applyCountries: boolean },
): Promise<DirectoryEntry[]> {
	const isAdmin = Boolean(actor?.isAdmin);
	const rows = await db.author.findMany({
		where: dbWhere(filters, isAdmin),
		select: authorCardSelect,
	});
	const ids = rows.map((row) => row.id);
	const [aggregates, follow] = await Promise.all([
		loadAuthorAggregates(db, ids),
		loadFollowInfo(db, ids, actor?.userId ?? null),
	]);

	return rows
		.map((row) => ({
			row,
			aggregate: aggregates.get(row.id) ?? EMPTY_AGGREGATE,
			followerCount: follow.counts.get(row.id) ?? 0,
			followedByMe: follow.followed.has(row.id),
		}))
		.filter(({ row, aggregate }) => {
			if (
				options.applyCountries &&
				filters.countries?.length &&
				!row.nationalities.some((code) => filters.countries?.includes(code))
			) {
				return false;
			}
			const average = averageRatingOf(aggregate);
			if (
				filters.minAverageRating != null ||
				filters.maxAverageRating != null
			) {
				if (average == null) return false;
				if (
					!inRange(average, filters.minAverageRating, filters.maxAverageRating)
				) {
					return false;
				}
			}
			return (
				inRange(aggregate.bookCount, filters.minBooks, filters.maxBooks) &&
				inRange(
					aggregate.readerCount,
					filters.minReaders,
					filters.maxReaders,
				) &&
				inRange(aggregate.readCount, filters.minReads, filters.maxReads) &&
				inRange(aggregate.pageCount, filters.minPages, filters.maxPages) &&
				inRange(aggregate.reviewCount, filters.minReviews, filters.maxReviews)
			);
		});
}

function sortValue(
	entry: DirectoryEntry,
	sortBy: string,
): number | string | null {
	switch (sortBy) {
		case "name":
			return entry.row.name;
		case "bookCount":
			return entry.aggregate.bookCount;
		case "readerCount":
			return entry.aggregate.readerCount;
		case "readCount":
			return entry.aggregate.readCount;
		case "pageCount":
			return entry.aggregate.pageCount;
		case "reviewCount":
			return entry.aggregate.reviewCount;
		case "averageRating":
			return averageRatingOf(entry.aggregate);
		case "followerCount":
			return entry.followerCount;
		case "createdAt":
			return entry.row.createdAt.getTime();
		case "birthYear":
			return entry.row.birthYear;
		default:
			return entry.row.name;
	}
}

/** Sorts entries; unknown values (null) always go last; ties fall back to the name. */
export function sortDirectory(
	entries: DirectoryEntry[],
	sortBy: string,
	direction: "asc" | "desc",
): DirectoryEntry[] {
	const factor = direction === "asc" ? 1 : -1;
	return entries.toSorted((a, b) => {
		const left = sortValue(a, sortBy);
		const right = sortValue(b, sortBy);
		if (left == null && right != null) return 1;
		if (left != null && right == null) return -1;
		if (left != null && right != null && left !== right) {
			const compared =
				typeof left === "string" && typeof right === "string"
					? left.localeCompare(right)
					: Number(left) - Number(right);
			if (compared !== 0) return compared * factor;
		}
		return a.row.name.localeCompare(b.row.name);
	});
}

export async function listAuthors(
	input: AuthorListInput,
	db: Database,
	viewer: Viewer,
): Promise<AuthorListOutput> {
	const actor = actorOf(viewer);
	const sorting = authorDirectorySorting.from(input);
	const { cursor, limit, sortBy: _s, sortDirection: _d, ...filters } = input;

	const entries = await loadDirectory(db, filters, actor, {
		applyCountries: true,
	});
	const sorted = sortDirectory(entries, sorting.sortBy, sorting.sortDirection);
	const page = pageInMemory(sorted, cursor, limit);

	return {
		items: page.items.map(
			(entry): AuthorCard =>
				toAuthorCard(
					entry.row,
					entry.aggregate,
					entry.followerCount,
					entry.followedByMe,
					Boolean(actor?.isAdmin),
				),
		),
		metadata: page.metadata,
	};
}

export async function listAuthorNationalityFacets(
	input: AuthorNationalityFacetsInput,
	db: Database,
	viewer: Viewer,
): Promise<AuthorNationalityFacetsOutput> {
	const actor = actorOf(viewer);
	const {
		pinnedCountryCodes,
		countries: _countries,
		sortBy: _s,
		sortDirection: _d,
		...filters
	} = input;
	const entries = await loadDirectory(db, filters, actor, {
		applyCountries: false,
	});

	const counts = new Map<string, number>();
	for (const code of pinnedCountryCodes ?? []) counts.set(code, 0);
	for (const { row } of entries) {
		for (const code of new Set(row.nationalities)) {
			counts.set(code, (counts.get(code) ?? 0) + 1);
		}
	}

	return {
		countries: [...counts.entries()]
			.map(([alpha2, authorCount]) => ({
				alpha2,
				name: getBookCountryName(alpha2) ?? alpha2,
				authorCount,
			}))
			.toSorted(
				(a, b) => b.authorCount - a.authorCount || a.name.localeCompare(b.name),
			),
	};
}

// ── Overview ───────────────────────────────────────────────────────────────

export async function getAuthor(
	slug: string,
	db: Database,
	viewer: Viewer,
): Promise<AuthorGetOutput> {
	const actor = actorOf(viewer);
	const resolved = await resolveAuthor(db, slug, viewer);

	const row = await db.author.findUniqueOrThrow({
		where: { id: resolved.id },
		select: authorProfileSelect,
	});

	const [aggregates, follow] = await Promise.all([
		loadAuthorAggregates(db, [resolved.id]),
		loadFollowInfo(db, [resolved.id], actor?.userId ?? null),
	]);
	const aggregate = aggregates.get(resolved.id) ?? EMPTY_AGGREGATE;

	const [readBookIds, series] = await Promise.all([
		loadViewerReadBookIds(db, actor?.userId ?? null, aggregate.bookIds),
		loadAuthorSeries(db, resolved.id, actor?.userId ?? null),
	]);
	const progress = readProgress(readBookIds.size, aggregate.bookCount);

	return {
		redirectTo: resolved.redirectTo,
		profile: buildAuthorProfile(row, Boolean(actor?.isAdmin)),
		numbers: {
			bookCount: aggregate.bookCount,
			readerCount: aggregate.readerCount,
			readCount: aggregate.readCount,
			reviewCount: aggregate.reviewCount,
			averageRating: averageRatingOf(aggregate),
			followerCount: follow.counts.get(resolved.id) ?? 0,
		},
		seriesSummary: { count: series.length, line: seriesSummaryLine(series) },
		viewer: {
			isSignedIn: actor != null,
			isAdmin: Boolean(actor?.isAdmin),
			followed: follow.followed.has(resolved.id),
			readCount: progress.read,
			totalBooks: progress.total,
			progress,
		},
	};
}

// ── About ──────────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
	name: "Name",
	sortName: "Sort name",
	bio: "Biography",
	birth: "Birth date",
	death: "Death date",
	birthPlace: "Birthplace",
	deathPlace: "Place of death",
	nationalities: "Nationality",
	gender: "Gender",
	wikipediaUrl: "Wikipedia link",
	goodreadsUrl: "Goodreads link",
	websiteUrl: "Website",
	photo: "Photo",
};

export async function getAuthorAbout(
	slug: string,
	db: Database,
	viewer: Viewer,
): Promise<AuthorAboutOutput> {
	const actor = actorOf(viewer);
	const resolved = await resolveAuthor(db, slug, viewer);
	const row = await db.author.findUniqueOrThrow({
		where: { id: resolved.id },
		select: authorProfileSelect,
	});
	const profile = buildAuthorProfile(row, Boolean(actor?.isAdmin));
	const meta = parseFieldMeta(row.fieldMeta);

	const filled: Record<string, boolean> = {
		name: true,
		sortName: row.sortName != null,
		bio: row.bio != null,
		birth: row.birthYear != null,
		death: row.deathYear != null,
		birthPlace: row.birthPlace != null,
		deathPlace: row.deathPlace != null,
		nationalities: row.nationalities.length > 0,
		gender: row.gender !== "unknown",
		wikipediaUrl: row.wikipediaUrl != null,
		goodreadsUrl: row.goodreadsUrl != null,
		websiteUrl: row.websiteUrl != null,
		photo: row.photoUrl != null,
	};

	const sources = Object.entries(meta)
		.filter(([field]) => filled[field])
		.map(([field, entry]) => ({
			field,
			label: FIELD_LABELS[field] ?? field,
			source: entry.source,
			sourceLabel: AUTHOR_FIELD_SOURCE_LABELS[entry.source],
			locked: actor?.isAdmin ? Boolean(entry.locked) : null,
		}));

	const missing: AuthorAboutOutput["missing"] = [];
	if (!row.bio) missing.push("bio");
	if (row.birthYear == null) missing.push("birth");
	if (profile.age.kind === "unknown" && row.birthYear != null) {
		missing.push("death");
	}
	if (!row.birthPlace && !row.deathPlace) missing.push("places");
	if (row.nationalities.length === 0) missing.push("nationality");
	if (row.gender === "unknown") missing.push("gender");
	if (!row.photoUrl) missing.push("photo");
	if (profile.links.length === 0) missing.push("links");

	return {
		sources,
		credits: {
			photo: profile.photo
				? {
						credit: profile.photo.credit,
						license: profile.photo.license,
						sourceUrl: profile.photo.sourceUrl,
					}
				: null,
			wikipediaAttribution: profile.bioAttribution != null,
			bioAttribution: profile.bioAttribution,
		},
		verified: profile.verified,
		autoFilled: profile.autoFilled,
		updatedAt:
			row.enrichedAt && row.enrichedAt > row.updatedAt
				? row.enrichedAt
				: row.updatedAt,
		missing,
	};
}
