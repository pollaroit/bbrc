import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { scheduleAuthorEnrichment } from "../../lib/author-enrichment/schedule";
import { definePagination } from "../../utils/pagination";
import {
	resolveAuthorsByNames,
	setBookAuthors,
} from "../author-admin/author-core";
import {
	notifyBookAddedToLibrary,
	notifyFollowersOfNewBook,
} from "../notification/notification-triggers";
import {
	createSeriesRecord,
	detachBookFromSeries,
	mapBookSeriesSummary,
	placeBookInSeries,
} from "../series/series.service";
import { publicShelfWhere } from "../shelf/shelf-visibility";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import { bookListSorting } from "./book.listing";
import {
	type GetBookListAuthorFacetsInput,
	type GetBookListAuthorFacetsOutput,
	type GetBookListCountryFacetsInput,
	type GetBookListCountryFacetsOutput,
	type GetBookListInput,
	type GetBookListOutput,
	type GetRandomBookInput,
	type GetRandomBookOutput,
	getBookListFields,
	type TAddBookInputSchema,
	type TGetBookBySlugOutputSchema,
	type TUpdateBookInputSchema,
	type TUpdateBookOutputSchema,
} from "./book.schema";
import { listAuthorFacetsForBooks } from "./book-author-filter";
import { bookAuthorRefsSelect, mapBookAuthorRefs } from "./book-author-refs";
import { listCountryFacetsForBooks } from "./book-country-filter";
import { assertOwnCoverUrl, isClubCoverId, newClubCoverId } from "./book-cover";
import { buildBookListWhereWithAuthors } from "./book-list-where";
import {
	mapReadAfterBooks,
	readAfterBookInclude,
	syncBookReadAfterPrerequisites,
} from "./book-reading-prerequisites";
import { generateBookSlug } from "./book-slug";
import { resolveClubSittingSlug } from "./resolve-club-sitting-slug";

const bookListSelect = {
	...getBookListFields,
	...bookAuthorRefsSelect,
	viewCount: true,
	readingNowCount: true,
	wishlistCount: true,
	viewerCount: true,
	createdAt: true,
	updatedAt: true,
	seriesMembership: {
		select: {
			position: true,
			series: { select: { slug: true, title: true } },
		},
	},
	sittingsSelectedFor: {
		where: { status: { in: ["reading", "finished"] } },
		orderBy: { updatedAt: "desc" as const },
		select: { slug: true, status: true },
	},
	_count: {
		select: {
			documents: { where: { status: "approved" as const } },
			reads: true,
			feedbacks: true,
			// Only shelves anyone can see count (not private ones or the Wishlist).
			shelfBooks: { where: { shelf: publicShelfWhere } },
			favorites: true,
		},
	},
} satisfies Prisma.BookSelect;

type BookListRow = Prisma.BookGetPayload<{
	select: typeof bookListSelect;
}>;

const bookListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: BookListRow): string {
		return item.slug;
	},
};

function withStableSlugOrderBy(
	orderBy: Prisma.BookOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.BookOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

function expandBookListOrderBy(
	sortBy: string,
	sortDirection: "asc" | "desc",
	orderBy: Prisma.BookOrderByWithRelationInput,
): Prisma.BookOrderByWithRelationInput[] {
	const nulls = "last" as const;
	if (sortBy === "averageRating") {
		return [
			{ averageRating: { sort: sortDirection, nulls } },
			{ slug: sortDirection },
		];
	}
	return withStableSlugOrderBy(orderBy, sortDirection);
}

export async function getRandomBook(
	input: GetRandomBookInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetRandomBookOutput> {
	if (
		(input.viewerRead != null ||
			input.viewerFavorite ||
			input.viewerReviewed ||
			input.viewerWishlist ||
			input.viewerReading) &&
		!viewerUserId
	) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by your own reads.",
		});
	}

	const where = await buildBookListWhereWithAuthors(input, db, viewerUserId);
	const matched = where == null ? 0 : await db.book.count({ where });

	if (where == null || matched === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "No book matches these filters.",
		});
	}

	const [book] = await db.book.findMany({
		where,
		orderBy: { id: "asc" },
		skip: Math.floor(Math.random() * matched),
		take: 1,
		select: { slug: true, title: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "No book matches these filters.",
		});
	}

	return { ...book, matched };
}

export async function getBookList(
	input: GetBookListInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListOutput> {
	const pagination = definePagination.cursor(input, bookListCursorCodec);
	const sorting = bookListSorting.from(input);

	const where = await buildBookListWhereWithAuthors(input, db, viewerUserId);

	if (where == null) {
		return {
			items: [],
			metadata: {
				limit: pagination.limit,
				hasNextPage: false,
				hasPreviousPage: pagination.hasPreviousPage,
				nextCursor: null,
				total: 0,
			},
		};
	}

	const isFirstPage = input.cursor == null;

	const [rows, total] = await Promise.all([
		db.book.findMany({
			...pagination.use(),
			where,
			orderBy: expandBookListOrderBy(
				sorting.sortBy,
				sorting.sortDirection,
				sorting.use(),
			),
			select: bookListSelect,
		}),
		isFirstPage ? db.book.count({ where }) : Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => {
			const {
				seriesMembership,
				sittingsSelectedFor,
				_count,
				authorLinks,
				...fields
			} = row;
			return {
				...fields,
				authorRefs: mapBookAuthorRefs(authorLinks),
				approvedDocumentCount: _count.documents,
				readCount: _count.reads,
				feedbackCount: _count.feedbacks,
				shelfCount: _count.shelfBooks,
				favoriteCount: _count.favorites,
				clubSittingSlug: resolveClubSittingSlug(
					fields.status,
					sittingsSelectedFor,
				),
				series: mapBookSeriesSummary(seriesMembership),
			};
		}),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function getBookListAuthorFacets(
	input: GetBookListAuthorFacetsInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListAuthorFacetsOutput> {
	const {
		pinnedAuthorSlugs,
		authors: _selectedAuthors,
		countries: _countries,
		...listInput
	} = input;

	const where = await buildBookListWhereWithAuthors(
		listInput,
		db,
		viewerUserId,
	);

	if (where == null) {
		return { authors: [] };
	}

	const authors = await listAuthorFacetsForBooks(
		db,
		where,
		pinnedAuthorSlugs ?? [],
	);

	return { authors };
}

export async function getBookListCountryFacets(
	input: GetBookListCountryFacetsInput,
	db: Database,
	viewerUserId?: string,
): Promise<GetBookListCountryFacetsOutput> {
	const {
		pinnedCountryCodes,
		countries: _selectedCountries,
		...listInput
	} = input;

	const where = await buildBookListWhereWithAuthors(
		listInput,
		db,
		viewerUserId,
	);

	if (where == null) {
		return { countries: [] };
	}

	const countries = await listCountryFacetsForBooks(
		db,
		where,
		pinnedCountryCodes ?? [],
	);

	return { countries };
}

export async function getBookBySlug(
	slug: string,
	db: Database,
): Promise<TGetBookBySlugOutputSchema> {
	const book = await db.book.findUnique({
		where: {
			slug,
		},
		omit: {
			id: true,
			updatedAt: true,
			requestedById: true,
			approvedById: true,
		},
		include: {
			requestedBy: {
				select: {
					username: true,
					name: true,
				},
			},
			readAfterPrerequisites: readAfterBookInclude,
			authorLinks: {
				orderBy: { position: "asc" },
				select: {
					author: {
						select: { id: true, slug: true, name: true, photoUrl: true },
					},
				},
			},
			seriesMembership: {
				select: {
					position: true,
					series: { select: { slug: true, title: true } },
				},
			},
		},
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug,
			},
		});
	}

	const { readAfterPrerequisites, seriesMembership, authorLinks, ...rest } =
		book;

	return normalizeBookRecord({
		...rest,
		authorRefs: authorLinks.map((link) => link.author),
		readAfterBooks: mapReadAfterBooks(readAfterPrerequisites),
		series: mapBookSeriesSummary(seriesMembership),
	});
}

function normalizeBookRecord<T extends TGetBookBySlugOutputSchema>(book: T): T {
	return {
		...book,
		subjectPeople: book.subjectPeople ?? [],
		subjectTimes: book.subjectTimes ?? [],
		subjects: book.subjects ?? [],
		countries: book.countries ?? [],
	};
}

/**
 * The authors a book form sent, as author ids in order: the chosen records, or names
 * resolved to existing authors (by name, alias or likely spelling) or created.
 */
async function resolveBookAuthors(
	tx: Parameters<Parameters<Database["$transaction"]>[0]>[0],
	input: { authorIds?: string[]; authors?: string[] },
	createdById: string | null,
): Promise<{ authorIds: string[]; createdIds: string[] }> {
	if (input.authorIds?.length) {
		const ids = [...new Set(input.authorIds)];
		const found = await tx.author.count({ where: { id: { in: ids } } });
		if (found !== ids.length) {
			throw new ORPCError("BAD_REQUEST", {
				message: "One of the authors no longer exists. Pick them again.",
			});
		}
		return { authorIds: ids, createdIds: [] };
	}
	const names = (input.authors ?? [])
		.map((name) => name.trim())
		.filter(Boolean);
	return resolveAuthorsByNames(tx, names, { createdById });
}

export async function addBook(
	input: TAddBookInputSchema,
	db: Database,
	adminUserId: string,
) {
	const {
		acceptanceNotes,
		readAfterBookSlugs,
		seriesSlug,
		newSeries,
		seriesPosition,
		shiftLater,
		customCoverUrl,
		notifyMembers,
		authorIds: inputAuthorIds,
		authors: inputAuthorNames,
		...bookInput
	} = input;
	const trimmedAcceptanceNotes = acceptanceNotes?.trim() || null;

	let interestedUserIds: string[] = [];
	let createdAuthorIds: string[] = [];
	const book = await db.$transaction(async (tx) => {
		const existing = await tx.book.findUnique({
			where: { olid: bookInput.olid },
			select: { slug: true },
		});

		if (existing) {
			throw new ORPCError("CONFLICT", {
				message: "A book with this Open Library ID is already in the catalog",
				data: { olid: bookInput.olid, slug: existing.slug },
			});
		}

		const slug = await generateBookSlug(bookInput.title, tx);

		const pendingRequests = await tx.bookRequest.findMany({
			where: { olid: bookInput.olid, status: "pending" },
			orderBy: { createdAt: "asc" },
			select: { userId: true, upvotes: { select: { userId: true } } },
		});
		const pendingRequest = pendingRequests[0];
		interestedUserIds = [
			...new Set(
				pendingRequests.flatMap((request) => [
					request.userId,
					...request.upvotes.map((vote) => vote.userId),
				]),
			),
		];

		let coverFields: { coverId?: number | null; customCoverUrl?: string } = {};
		if (customCoverUrl) {
			assertOwnCoverUrl(customCoverUrl);
			coverFields = {
				coverId: await newClubCoverId(tx),
				customCoverUrl,
			};
		}

		const resolvedAuthors = await resolveBookAuthors(
			tx,
			{ authorIds: inputAuthorIds, authors: inputAuthorNames },
			adminUserId,
		);
		createdAuthorIds = resolvedAuthors.createdIds;

		const book = await tx.book.create({
			data: {
				...bookInput,
				// The names copy; `setBookAuthors` below keeps it equal to the author records.
				authors: [],
				subjectPeople: bookInput.subjectPeople ?? [],
				subjectTimes: bookInput.subjectTimes ?? [],
				subjects: bookInput.subjects ?? [],
				countries: bookInput.countries ?? [],
				...coverFields,
				slug,
				approvedById: adminUserId,
				requestedById: pendingRequest?.userId ?? null,
			},
			select: {
				id: true,
				slug: true,
			},
		});

		await setBookAuthors(tx, book.id, resolvedAuthors.authorIds);

		if (readAfterBookSlugs && readAfterBookSlugs.length > 0) {
			await syncBookReadAfterPrerequisites(book.id, readAfterBookSlugs, tx);
		}

		await tx.bookRequest.updateMany({
			where: { olid: bookInput.olid, status: "pending" },
			data: {
				status: "accepted",
				acceptanceNotes: trimmedAcceptanceNotes,
				rejectionReason: null,
			},
		});

		let attachedSeriesSlug: string | undefined;

		if (newSeries) {
			const created = await createSeriesRecord(newSeries, tx);
			await placeBookInSeries(tx, {
				bookId: book.id,
				seriesSlug: created.slug,
				position: seriesPosition,
				shiftLater,
			});
			attachedSeriesSlug = created.slug;
		} else if (seriesSlug) {
			const attached = await placeBookInSeries(tx, {
				bookId: book.id,
				seriesSlug,
				position: seriesPosition,
				shiftLater,
			});
			attachedSeriesSlug = attached.slug;
		}

		return { ...book, seriesSlug: attachedSeriesSlug };
	});

	// New authors fill themselves in (Open Library, Wikidata, Wikipedia) without holding the request up.
	scheduleAuthorEnrichment(db, createdAuthorIds);

	// Quiet adds only tell the people who asked for the book (or said "me too"); otherwise members
	// following one of the authors also hear about it. One after the other, not side by side.
	void (async () => {
		await notifyBookAddedToLibrary(
			db,
			book.slug,
			notifyMembers === false ? { onlyUserIds: interestedUserIds } : undefined,
		);
		if (notifyMembers !== false) {
			await notifyFollowersOfNewBook(db, book.slug, {
				excludeUserIds: [adminUserId],
			});
		}
	})().catch((error) => console.error("book added notices failed", error));

	return book;
}

export async function updateBook(
	input: TUpdateBookInputSchema,
	db: Database,
	adminUserId: string | null = null,
): Promise<TUpdateBookOutputSchema> {
	const book = await db.book.findUnique({
		where: { slug: input.slug },
		select: { id: true, coverId: true, customCoverUrl: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug: input.slug,
			},
		});
	}

	let replacedCoverUrl: string | null = null;
	let createdAuthorIds: string[] = [];

	const result = await db.$transaction(async (tx) => {
		const {
			slug,
			readAfterBookSlugs,
			customCoverUrl,
			series,
			authorIds: inputAuthorIds,
			authors: inputAuthorNames,
			...data
		} = input;
		const coverFields: {
			coverId?: number | null;
			customCoverUrl?: string | null;
		} = {};

		if (customCoverUrl) {
			assertOwnCoverUrl(customCoverUrl);
			coverFields.coverId = await newClubCoverId(tx);
			coverFields.customCoverUrl = customCoverUrl;
			replacedCoverUrl = book.customCoverUrl;
		} else if (customCoverUrl === null && book.customCoverUrl) {
			// Removing the upload: fall back to the Open Library cover that was sent, if any.
			coverFields.customCoverUrl = null;
			if (data.coverId === undefined && isClubCoverId(book.coverId)) {
				coverFields.coverId = null;
			}
			replacedCoverUrl = book.customCoverUrl;
		}

		await tx.book.update({
			where: { id: book.id },
			data: { ...data, ...coverFields },
		});

		if (inputAuthorIds?.length || inputAuthorNames?.length) {
			const resolved = await resolveBookAuthors(
				tx,
				{ authorIds: inputAuthorIds, authors: inputAuthorNames },
				adminUserId,
			);
			createdAuthorIds = resolved.createdIds;
			// Taking an author off a book never deletes the author.
			await setBookAuthors(tx, book.id, resolved.authorIds);
		}

		if (readAfterBookSlugs !== undefined) {
			await syncBookReadAfterPrerequisites(book.id, readAfterBookSlugs, tx);
		}

		if (series === null) {
			await detachBookFromSeries(tx, book.id);
		} else if (series) {
			let targetSlug = series.seriesSlug;
			if (series.newSeries) {
				await detachBookFromSeries(tx, book.id);
				targetSlug = (await createSeriesRecord(series.newSeries, tx)).slug;
			} else if (targetSlug) {
				const current = await tx.seriesBook.findUnique({
					where: { bookId: book.id },
					select: { series: { select: { slug: true } } },
				});
				if (current && current.series.slug !== targetSlug) {
					await detachBookFromSeries(tx, book.id);
				}
			}
			if (targetSlug) {
				await placeBookInSeries(tx, {
					bookId: book.id,
					seriesSlug: targetSlug,
					position: series.position,
					shiftLater: series.shiftLater,
				});
			}
		}

		return { slug };
	});

	void tryDeleteR2PublicUrl(replacedCoverUrl);
	scheduleAuthorEnrichment(db, createdAuthorIds);

	return result;
}

export async function removeBook(slug: string, db: Database): Promise<string> {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, status: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: {
				slug,
			},
		});
	}

	if (book.status !== "wishlist") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Only wishlist books can be removed. Change status or keep the title in the catalog.",
			data: { slug, status: book.status },
		});
	}

	await db.$transaction(async (tx) => {
		await tx.favorite.deleteMany({ where: { bookId: book.id } });
		await tx.book.delete({
			where: { id: book.id },
		});
	});

	return slug;
}
