import {
	AUTHOR_FIELDS,
	type AuthorField,
	type AuthorFieldMeta,
	type AuthorFieldSource,
} from "@bbrc/shared";

/**
 * Pure rules behind the admin author dashboards (overview, list, stats): which fields are
 * filled, where they came from, and the list filters. No database in here, so they are tested alone.
 */

export type DashboardAuthor = {
	id: string;
	slug: string;
	name: string;
	sortName: string | null;
	bio: string | null;
	birthYear: number | null;
	deathYear: number | null;
	birthPlace: string | null;
	deathPlace: string | null;
	nationalities: string[];
	gender: "female" | "male" | "non_binary" | "other" | "unknown";
	wikipediaUrl: string | null;
	goodreadsUrl: string | null;
	websiteUrl: string | null;
	photoUrl: string | null;
	wikidataId: string | null;
	openLibraryId: string | null;
	status: "verified" | "auto" | "needs_review";
	enrichmentStatus: "pending" | "running" | "done" | "failed";
	enrichmentAttempts: number;
	enrichmentError: string | null;
	fieldMeta: AuthorFieldMeta;
	aliases: string[];
	createdAt: Date;
	updatedAt: Date;
	enrichedAt: Date | null;
	bookCount: number;
	readerCount: number;
	readCount: number;
	followerCount: number;
};

/** Whether the author has a value for the field. (The name is always there.) */
export function isFieldFilled(
	author: Pick<
		DashboardAuthor,
		| "sortName"
		| "bio"
		| "birthYear"
		| "deathYear"
		| "birthPlace"
		| "deathPlace"
		| "nationalities"
		| "gender"
		| "wikipediaUrl"
		| "goodreadsUrl"
		| "websiteUrl"
		| "photoUrl"
	>,
	field: AuthorField,
): boolean {
	switch (field) {
		case "name":
			return true;
		case "sortName":
			return Boolean(author.sortName);
		case "bio":
			return Boolean(author.bio?.trim());
		case "birth":
			return author.birthYear != null;
		case "death":
			return author.deathYear != null;
		case "birthPlace":
			return Boolean(author.birthPlace);
		case "deathPlace":
			return Boolean(author.deathPlace);
		case "nationalities":
			return author.nationalities.length > 0;
		case "gender":
			return author.gender !== "unknown";
		case "wikipediaUrl":
			return Boolean(author.wikipediaUrl);
		case "goodreadsUrl":
			return Boolean(author.goodreadsUrl);
		case "websiteUrl":
			return Boolean(author.websiteUrl);
		case "photo":
			return Boolean(author.photoUrl);
	}
}

/** Fields counted in the "profile coverage" charts (death is only expected for authors who died, so it is left out). */
export const COVERAGE_FIELDS = [
	"bio",
	"photo",
	"birth",
	"birthPlace",
	"nationalities",
	"gender",
	"wikipediaUrl",
	"goodreadsUrl",
	"websiteUrl",
] as const satisfies readonly AuthorField[];

export function coverageOf(
	authors: readonly DashboardAuthor[],
): { field: AuthorField; filled: number; total: number; percent: number }[] {
	const total = authors.length;
	return COVERAGE_FIELDS.map((field) => {
		const filled = authors.filter((author) =>
			isFieldFilled(author, field),
		).length;
		return {
			field,
			filled,
			total,
			percent: total === 0 ? 0 : Math.round((filled / total) * 1000) / 10,
		};
	});
}

export type SourceKey = AuthorFieldSource | "unknown";

export const SOURCE_KEYS: readonly SourceKey[] = [
	"openlibrary",
	"wikidata",
	"wikipedia",
	"ai",
	"admin",
	"unknown",
];

/**
 * Where each filled field came from. A filled field without a recorded source (for example
 * a bio from before provenance existed) counts as `unknown`; empty fields count for nothing.
 */
export function sourcesByField(authors: readonly DashboardAuthor[]) {
	return COVERAGE_FIELDS.map((field) => {
		const counts: Record<SourceKey, number> = {
			openlibrary: 0,
			wikidata: 0,
			wikipedia: 0,
			ai: 0,
			admin: 0,
			unknown: 0,
		};
		for (const author of authors) {
			if (!isFieldFilled(author, field)) continue;
			const source = author.fieldMeta[field]?.source ?? "unknown";
			counts[source] += 1;
		}
		return { field, ...counts };
	});
}

export function sourceTotals(
	rows: ReturnType<typeof sourcesByField>,
): Record<SourceKey, number> {
	const totals: Record<SourceKey, number> = {
		openlibrary: 0,
		wikidata: 0,
		wikipedia: 0,
		ai: 0,
		admin: 0,
		unknown: 0,
	};
	for (const row of rows) {
		for (const key of SOURCE_KEYS) totals[key] += row[key];
	}
	return totals;
}

export function hasAnySource(
	author: Pick<DashboardAuthor, "fieldMeta">,
	sources: readonly AuthorFieldSource[],
): boolean {
	return AUTHOR_FIELDS.some((field) => {
		const source = author.fieldMeta[field]?.source;
		return source != null && sources.includes(source);
	});
}

export function hasLockedField(
	author: Pick<DashboardAuthor, "fieldMeta">,
): boolean {
	return AUTHOR_FIELDS.some(
		(field) => author.fieldMeta[field]?.locked === true,
	);
}

export type DashboardFilters = {
	statuses?: DashboardAuthor["status"][];
	enrichmentStatuses?: DashboardAuthor["enrichmentStatus"][];
	nationalities?: string[];
	genders?: DashboardAuthor["gender"][];
	sources?: AuthorFieldSource[];
	/** Authors missing at least one of these fields. */
	missingFields?: AuthorField[];
	hasPhoto?: boolean;
	hasBio?: boolean;
	/** `true`: at least one hand-locked field. `false`: none. */
	hasLocks?: boolean;
	/** `true`: no books at all (hidden from the public lists). */
	withoutBooks?: boolean;
	minBooks?: number;
	maxBooks?: number;
	minReaders?: number;
	minFollowers?: number;
};

/** Whether an author passes the list filters (search and the date range are applied by the caller). */
export function matchesDashboardFilters(
	author: DashboardAuthor,
	filters: DashboardFilters,
): boolean {
	if (filters.statuses?.length && !filters.statuses.includes(author.status)) {
		return false;
	}
	if (
		filters.enrichmentStatuses?.length &&
		!filters.enrichmentStatuses.includes(author.enrichmentStatus)
	) {
		return false;
	}
	if (filters.genders?.length && !filters.genders.includes(author.gender)) {
		return false;
	}
	if (
		filters.nationalities?.length &&
		!author.nationalities.some((code) => filters.nationalities?.includes(code))
	) {
		return false;
	}
	if (filters.sources?.length && !hasAnySource(author, filters.sources)) {
		return false;
	}
	if (
		filters.missingFields?.length &&
		!filters.missingFields.some((field) => !isFieldFilled(author, field))
	) {
		return false;
	}
	if (
		filters.hasPhoto != null &&
		isFieldFilled(author, "photo") !== filters.hasPhoto
	) {
		return false;
	}
	if (
		filters.hasBio != null &&
		isFieldFilled(author, "bio") !== filters.hasBio
	) {
		return false;
	}
	if (filters.hasLocks != null && hasLockedField(author) !== filters.hasLocks) {
		return false;
	}
	if (
		filters.withoutBooks != null &&
		(author.bookCount === 0) !== filters.withoutBooks
	) {
		return false;
	}
	if (filters.minBooks != null && author.bookCount < filters.minBooks)
		return false;
	if (filters.maxBooks != null && author.bookCount > filters.maxBooks)
		return false;
	if (filters.minReaders != null && author.readerCount < filters.minReaders) {
		return false;
	}
	if (
		filters.minFollowers != null &&
		author.followerCount < filters.minFollowers
	) {
		return false;
	}
	return true;
}

export const ADMIN_AUTHOR_SORT_FIELDS = [
	"name",
	"createdAt",
	"updatedAt",
	"enrichedAt",
	"status",
	"bookCount",
	"readerCount",
	"readCount",
	"followerCount",
	"birthYear",
] as const;
export type AdminAuthorSortField = (typeof ADMIN_AUTHOR_SORT_FIELDS)[number];

const STATUS_ORDER: Record<DashboardAuthor["status"], number> = {
	needs_review: 0,
	auto: 1,
	verified: 2,
};

/** In-memory sort: the name breaks ties, empty values sort last whatever the direction. */
export function sortDashboardAuthors(
	authors: readonly DashboardAuthor[],
	sortBy: AdminAuthorSortField,
	direction: "asc" | "desc",
): DashboardAuthor[] {
	const factor = direction === "asc" ? 1 : -1;
	const value = (author: DashboardAuthor): number | string | null => {
		switch (sortBy) {
			case "name":
				return author.name;
			case "createdAt":
				return author.createdAt.getTime();
			case "updatedAt":
				return author.updatedAt.getTime();
			case "enrichedAt":
				return author.enrichedAt?.getTime() ?? null;
			case "status":
				return STATUS_ORDER[author.status];
			case "bookCount":
				return author.bookCount;
			case "readerCount":
				return author.readerCount;
			case "readCount":
				return author.readCount;
			case "followerCount":
				return author.followerCount;
			case "birthYear":
				return author.birthYear;
		}
	};
	return authors.toSorted((a, b) => {
		const left = value(a);
		const right = value(b);
		if (left == null && right != null) return 1;
		if (left != null && right == null) return -1;
		if (left != null && right != null && left !== right) {
			const compared =
				typeof left === "string" && typeof right === "string"
					? left.localeCompare(right)
					: Number(left) - Number(right);
			if (compared !== 0) return compared * factor;
		}
		return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
	});
}

/** Buckets of "how many books", for the books-per-author chart. */
export function bookCountBuckets(
	counts: readonly number[],
): { key: string; label: string; count: number }[] {
	const buckets = [
		{ key: "0", label: "No books", min: 0, max: 0 },
		{ key: "1", label: "1 book", min: 1, max: 1 },
		{ key: "2", label: "2 books", min: 2, max: 2 },
		{ key: "3-5", label: "3–5 books", min: 3, max: 5 },
		{ key: "6-10", label: "6–10 books", min: 6, max: 10 },
		{ key: "11+", label: "11 or more", min: 11, max: Number.POSITIVE_INFINITY },
	];
	return buckets.map((bucket) => ({
		key: bucket.key,
		label: bucket.label,
		count: counts.filter((n) => n >= bucket.min && n <= bucket.max).length,
	}));
}
