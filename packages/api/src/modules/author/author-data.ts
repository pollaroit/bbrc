import type { Database, Prisma } from "@bbrc/db";
import {
	type AuthorField,
	type AuthorFieldMeta,
	type AuthorFieldSource,
	authorAgeLine,
	formatAuthorDate,
	formatAuthorLifespan,
	getBookCountryName,
} from "@bbrc/shared";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	AuthorBookItem,
	AuthorCard,
	AuthorProfile,
} from "./author.schema";

// ── Small mappers ──────────────────────────────────────────────────────────

export function nationalityList(codes: readonly string[]) {
	return codes.map((code) => ({
		code,
		name: getBookCountryName(code) ?? code,
	}));
}

/** The gender to show: null when unknown. */
export function shownGender<T extends string>(
	gender: T,
): Exclude<T, "unknown"> | null {
	return gender === "unknown" ? null : (gender as Exclude<T, "unknown">);
}

export function parseFieldMeta(value: unknown): AuthorFieldMeta {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const meta: AuthorFieldMeta = {};
	for (const [field, entry] of Object.entries(value)) {
		if (
			entry &&
			typeof entry === "object" &&
			typeof (entry as { source?: unknown }).source === "string"
		) {
			meta[field as AuthorField] = {
				source: (entry as { source: AuthorFieldSource }).source,
				locked: Boolean((entry as { locked?: unknown }).locked),
			};
		}
	}
	return meta;
}

// ── Per-author numbers ─────────────────────────────────────────────────────

export type AuthorAggregate = {
	bookCount: number;
	/** Different visible members who read at least one book. */
	readerCount: number;
	/** All reads by visible members. */
	readCount: number;
	reviewCount: number;
	ratingSum: number;
	coverIds: (number | null)[];
	bookIds: string[];
};

export const EMPTY_AGGREGATE: AuthorAggregate = {
	bookCount: 0,
	readerCount: 0,
	readCount: 0,
	reviewCount: 0,
	ratingSum: 0,
	coverIds: [],
	bookIds: [],
};

export function averageRatingOf(aggregate: AuthorAggregate): number | null {
	return aggregate.reviewCount > 0
		? Math.round((aggregate.ratingSum / aggregate.reviewCount) * 100) / 100
		: null;
}

/**
 * Book, reader and review numbers for many authors in four queries. Hidden members
 * never count. Covers come in title order.
 */
export async function loadAuthorAggregates(
	db: Database,
	authorIds: readonly string[],
): Promise<Map<string, AuthorAggregate>> {
	const result = new Map<string, AuthorAggregate>();
	if (authorIds.length === 0) return result;

	const links = await db.bookAuthor.findMany({
		where: { authorId: { in: [...authorIds] } },
		select: {
			authorId: true,
			book: { select: { id: true, title: true, coverId: true } },
		},
	});
	const bookIds = [...new Set(links.map((link) => link.book.id))];

	const [reads, feedback] =
		bookIds.length === 0
			? [[], []]
			: await Promise.all([
					db.read.findMany({
						where: { bookId: { in: bookIds }, user: visibleOnSiteUserWhere },
						select: { bookId: true, userId: true },
					}),
					db.feedback.groupBy({
						by: ["bookId"],
						where: { bookId: { in: bookIds }, author: visibleOnSiteUserWhere },
						_count: { _all: true },
						_sum: { rating: true },
					}),
				]);

	const readersByBook = new Map<string, string[]>();
	for (const read of reads) {
		const list = readersByBook.get(read.bookId) ?? [];
		list.push(read.userId);
		readersByBook.set(read.bookId, list);
	}
	const feedbackByBook = new Map(feedback.map((row) => [row.bookId, row]));

	const booksByAuthor = new Map<string, typeof links>();
	for (const link of links) {
		const list = booksByAuthor.get(link.authorId) ?? [];
		list.push(link);
		booksByAuthor.set(link.authorId, list);
	}

	for (const [authorId, authorLinks] of booksByAuthor) {
		const readers = new Set<string>();
		let readCount = 0;
		let reviewCount = 0;
		let ratingSum = 0;
		for (const { book } of authorLinks) {
			const bookReaders = readersByBook.get(book.id) ?? [];
			readCount += bookReaders.length;
			for (const userId of bookReaders) readers.add(userId);
			const stats = feedbackByBook.get(book.id);
			if (stats) {
				reviewCount += stats._count._all;
				ratingSum += stats._sum.rating ?? 0;
			}
		}
		const byTitle = authorLinks.toSorted((a, b) =>
			a.book.title.localeCompare(b.book.title),
		);
		result.set(authorId, {
			bookCount: authorLinks.length,
			readerCount: readers.size,
			readCount,
			reviewCount,
			ratingSum,
			coverIds: byTitle.slice(0, 4).map((link) => link.book.coverId),
			bookIds: authorLinks.map((link) => link.book.id),
		});
	}
	return result;
}

/** Followers per author (hidden members do not count) and the viewer's own follows. */
export async function loadFollowInfo(
	db: Database,
	authorIds: readonly string[],
	viewerId: string | null,
) {
	const counts = new Map<string, number>();
	const followed = new Set<string>();
	if (authorIds.length === 0) return { counts, followed };

	const [groups, mine] = await Promise.all([
		db.follow.groupBy({
			by: ["authorId"],
			where: {
				targetType: "author",
				authorId: { in: [...authorIds] },
				follower: visibleOnSiteUserWhere,
			},
			_count: { _all: true },
		}),
		viewerId
			? db.follow.findMany({
					where: {
						followerId: viewerId,
						targetType: "author",
						authorId: { in: [...authorIds] },
					},
					select: { authorId: true },
				})
			: Promise.resolve([]),
	]);
	for (const group of groups) {
		if (group.authorId) counts.set(group.authorId, group._count._all);
	}
	for (const row of mine) {
		if (row.authorId) followed.add(row.authorId);
	}
	return { counts, followed };
}

// ── Cards ──────────────────────────────────────────────────────────────────

export const authorCardSelect = {
	id: true,
	slug: true,
	name: true,
	birthYear: true,
	deathYear: true,
	nationalities: true,
	gender: true,
	photoUrl: true,
	status: true,
	createdAt: true,
} satisfies Prisma.AuthorSelect;

export type AuthorCardRow = Prisma.AuthorGetPayload<{
	select: typeof authorCardSelect;
}>;

export function toAuthorCard(
	row: AuthorCardRow,
	aggregate: AuthorAggregate,
	followerCount: number,
	followedByMe: boolean,
	isAdmin: boolean,
): AuthorCard {
	return {
		slug: row.slug,
		name: row.name,
		lifespan: formatAuthorLifespan({
			birth: { year: row.birthYear },
			death: { year: row.deathYear },
		}),
		birthYear: row.birthYear,
		deathYear: row.deathYear,
		nationalities: nationalityList(row.nationalities),
		gender: shownGender(row.gender),
		photoUrl: row.photoUrl,
		bookCount: aggregate.bookCount,
		readerCount: aggregate.readerCount,
		reviewCount: aggregate.reviewCount,
		averageRating: averageRatingOf(aggregate),
		followerCount,
		followedByMe,
		status: isAdmin ? row.status : null,
		coverIds: aggregate.coverIds,
	};
}

// ── Profile ────────────────────────────────────────────────────────────────

export const authorProfileSelect = {
	id: true,
	slug: true,
	name: true,
	sortName: true,
	bio: true,
	bioSource: true,
	birthYear: true,
	birthMonth: true,
	birthDay: true,
	deathYear: true,
	deathMonth: true,
	deathDay: true,
	birthPlace: true,
	deathPlace: true,
	nationalities: true,
	gender: true,
	wikipediaUrl: true,
	goodreadsUrl: true,
	openLibraryId: true,
	wikidataId: true,
	websiteUrl: true,
	photoUrl: true,
	photoCredit: true,
	photoLicense: true,
	photoSourceUrl: true,
	status: true,
	fieldMeta: true,
	enrichmentStatus: true,
	enrichmentError: true,
	enrichedAt: true,
	createdAt: true,
	updatedAt: true,
	aliases: { select: { alias: true }, orderBy: { alias: "asc" } },
} satisfies Prisma.AuthorSelect;

export type AuthorProfileRow = Prisma.AuthorGetPayload<{
	select: typeof authorProfileSelect;
}>;

const BIO_SOURCES = new Set([
	"openlibrary",
	"wikidata",
	"wikipedia",
	"ai",
	"admin",
]);

export function buildAuthorProfile(
	row: AuthorProfileRow,
	isAdmin: boolean,
	now = new Date(),
): AuthorProfile {
	const birth = {
		year: row.birthYear,
		month: row.birthMonth,
		day: row.birthDay,
	};
	const death = {
		year: row.deathYear,
		month: row.deathMonth,
		day: row.deathDay,
	};
	const meta = parseFieldMeta(row.fieldMeta);
	const bioSource =
		row.bioSource && BIO_SOURCES.has(row.bioSource)
			? (row.bioSource as AuthorFieldSource)
			: (meta.bio?.source ?? null);

	const links: AuthorProfile["links"] = [];
	if (row.wikipediaUrl) {
		links.push({
			kind: "wikipedia",
			label: "Wikipedia",
			url: row.wikipediaUrl,
		});
	}
	if (row.goodreadsUrl) {
		links.push({
			kind: "goodreads",
			label: "Goodreads",
			url: row.goodreadsUrl,
		});
	}
	if (row.openLibraryId) {
		links.push({
			kind: "openlibrary",
			label: "Open Library",
			url: `https://openlibrary.org/authors/${row.openLibraryId}`,
		});
	}
	if (row.wikidataId) {
		links.push({
			kind: "wikidata",
			label: "Wikidata",
			url: `https://www.wikidata.org/wiki/${row.wikidataId}`,
		});
	}
	if (row.websiteUrl) {
		links.push({ kind: "website", label: "Website", url: row.websiteUrl });
	}

	return {
		slug: row.slug,
		name: row.name,
		sortName: row.sortName,
		aliases: row.aliases.map((alias) => alias.alias),
		bio: row.bio,
		bioSource,
		bioAttribution:
			row.bio && bioSource === "wikipedia"
				? {
						label: "Wikipedia",
						url: row.wikipediaUrl,
						licenseNote: "Text from Wikipedia, available under CC BY-SA 4.0.",
					}
				: null,
		birth: {
			...birth,
			text: formatAuthorDate(birth),
			place: row.birthPlace,
		},
		death: {
			...death,
			text: formatAuthorDate(death),
			place: row.deathPlace,
		},
		lifespan: formatAuthorLifespan({ birth, death }),
		age: authorAgeLine({ birth, death, now }),
		nationalities: nationalityList(row.nationalities),
		gender: shownGender(row.gender),
		links,
		photo: row.photoUrl
			? {
					url: row.photoUrl,
					credit: row.photoCredit,
					license: row.photoLicense,
					sourceUrl: row.photoSourceUrl,
				}
			: null,
		verified: row.status === "verified",
		autoFilled: row.status !== "verified",
		admin: isAdmin
			? {
					status: row.status,
					enrichmentStatus: row.enrichmentStatus,
					enrichmentError: row.enrichmentError,
					enrichedAt: row.enrichedAt,
					openLibraryId: row.openLibraryId,
					wikidataId: row.wikidataId,
					fieldMeta: meta as Record<
						string,
						{ source: AuthorFieldSource; locked?: boolean }
					>,
				}
			: null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

// ── The author's books ─────────────────────────────────────────────────────

export const authorBookSelect = {
	id: true,
	slug: true,
	title: true,
	authors: true,
	coverId: true,
	publishedIn: true,
	pages: true,
	averageRating: true,
	createdAt: true,
	_count: {
		select: {
			reads: { where: { user: visibleOnSiteUserWhere } },
			feedbacks: { where: { author: visibleOnSiteUserWhere } },
		},
	},
	seriesMembership: {
		select: {
			position: true,
			series: { select: { slug: true, title: true } },
		},
	},
	authorLinks: {
		orderBy: { position: "asc" },
		select: { authorId: true, author: { select: { slug: true, name: true } } },
	},
} satisfies Prisma.BookSelect;

export type AuthorBookRow = Prisma.BookGetPayload<{
	select: typeof authorBookSelect;
}>;

/** All books by an author (an author has a handful, so this is loaded whole and paged in memory). */
export async function loadAuthorBookRows(
	db: Database,
	authorId: string,
): Promise<AuthorBookRow[]> {
	return db.book.findMany({
		where: { authorLinks: { some: { authorId } } },
		select: authorBookSelect,
	});
}

export function bookRef(book: {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
}) {
	return {
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		coverId: book.coverId,
	};
}

export function toAuthorBookItem(
	row: AuthorBookRow,
	authorId: string,
	readBookIds: Set<string>,
): AuthorBookItem {
	return {
		...bookRef(row),
		publishedIn: row.publishedIn,
		pages: row.pages,
		averageRating: row.averageRating,
		readCount: row._count.reads,
		feedbackCount: row._count.feedbacks,
		createdAt: row.createdAt,
		series: row.seriesMembership
			? {
					slug: row.seriesMembership.series.slug,
					title: row.seriesMembership.series.title,
					position: row.seriesMembership.position,
				}
			: null,
		coAuthors: row.authorLinks
			.filter((link) => link.authorId !== authorId)
			.map((link) => ({ slug: link.author.slug, name: link.author.name })),
		readByMe: readBookIds.has(row.id),
	};
}

/** Ids of the given books the member has read. */
export async function loadViewerReadBookIds(
	db: Database,
	viewerId: string | null,
	bookIds: readonly string[],
): Promise<Set<string>> {
	if (!viewerId || bookIds.length === 0) return new Set();
	const rows = await db.read.findMany({
		where: { userId: viewerId, bookId: { in: [...bookIds] } },
		select: { bookId: true },
	});
	return new Set(rows.map((row) => row.bookId));
}

// ── Offset cursors ─────────────────────────────────────────────────────────

/** Cursors of the author endpoints are the number of rows already shown. */
export function parseOffsetCursor(cursor: string | undefined): number {
	const parsed = cursor ? Number.parseInt(cursor, 10) : 0;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function offsetMetadata(input: {
	limit: number;
	skip: number;
	shown: number;
	hasNextPage: boolean;
	total?: number;
}) {
	return {
		limit: input.limit,
		hasNextPage: input.hasNextPage,
		hasPreviousPage: input.skip > 0,
		nextCursor: input.hasNextPage ? String(input.skip + input.shown) : null,
		...(input.skip === 0 && input.total != null ? { total: input.total } : {}),
	};
}

/** Pages an in-memory list. */
export function pageInMemory<T>(
	items: readonly T[],
	cursor: string | undefined,
	limit: number,
) {
	const skip = parseOffsetCursor(cursor);
	const page = items.slice(skip, skip + limit);
	return {
		items: page,
		metadata: offsetMetadata({
			limit,
			skip,
			shown: page.length,
			hasNextPage: skip + page.length < items.length,
			total: items.length,
		}),
	};
}
