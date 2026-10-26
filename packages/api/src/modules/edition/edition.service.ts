import type { Database } from "@bbrc/db";
import {
	editionExternalLinks,
	formatEditionLanguage,
	normalizeLanguageCode,
	openLibraryEditionKey,
	parseEditionKey,
	richContentPreview,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	fetchIsBorrowable,
	fetchOpenLibraryEditionFull,
	type OpenLibraryEditionFull,
	resolveOpenLibraryEditionByIsbn,
	yearFromPublishDate,
} from "../../lib/open-library/edition-full";
import { listWorkEditions } from "../../lib/open-library/work-editions";
import {
	bookAuthorRefsSelect,
	mapBookAuthorRefs,
} from "../book/book-author-refs";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	EditionCore,
	EditionLookup,
	EditionReaders,
	EditionSummary,
	EditionViewer,
} from "./edition.schema";
import {
	averageDays,
	canonicalKeyOfMember,
	differencesFrom,
	formatLabelOf,
	loadUsageContext,
	type MemberEditionRow,
	memberSummarySource,
	pagesPerDay,
	summaryOf,
	type UsageContext,
} from "./edition-support";

type Actor = { id: string; isAdmin: boolean };

const REVIEW_LIMIT = 6;
const OTHERS_LIMIT = 12;
const READERS_LIMIT = 50;

async function loadBook(db: Database, slug: string) {
	const book = await db.book.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			title: true,
			authors: true,
			...bookAuthorRefsSelect,
			coverId: true,
			pages: true,
			olid: true,
		},
	});
	if (!book) throw new ORPCError("NOT_FOUND", { message: "Book not found" });
	return book;
}
type BookRow = Awaited<ReturnType<typeof loadBook>>;

// ── Saved copies of Open Library editions ──────────────────────────────────

/** Keeps what we know about an Open Library edition members use (best effort). */
export async function saveEditionSnapshot(
	db: Database,
	bookId: string,
	full: OpenLibraryEditionFull,
): Promise<void> {
	try {
		const data = {
			bookId,
			title: full.title,
			language: full.languageKeys[0]
				? normalizeLanguageCode(full.languageKeys[0])
				: null,
			pages: full.pages,
			coverId: full.covers[0] ?? null,
			publisher: full.publishers[0] ?? null,
			publishedYear: full.publishedYear,
			format: full.physicalFormat,
		};
		await db.editionSnapshot.upsert({
			where: { olid: full.olid },
			create: { olid: full.olid, ...data },
			update: data,
		});
	} catch (error) {
		console.error("edition snapshot failed", error);
	}
}

/** Fetches an Open Library edition and saves a copy of it, in the background. */
export function snapshotOpenLibraryEdition(
	db: Database,
	bookId: string,
	olid: string,
): void {
	void (async () => {
		const full = await fetchOpenLibraryEditionFull(olid);
		if (full) await saveEditionSnapshot(db, bookId, full);
	})();
}

// ── Building the core of the page ──────────────────────────────────────────

function coreFromMember(
	row: MemberEditionRow,
	linkedMemberKey: string | null,
): EditionCore {
	return {
		key: canonicalKeyOfMember(row),
		source: "member",
		verified: row.status === "verified",
		title: row.title,
		editionName: null,
		languageCode: row.language,
		language: formatEditionLanguage(row.language),
		format: formatLabelOf(row.format),
		pages: row.pages,
		publishers: row.publisher ? [row.publisher] : [],
		publishPlaces: [],
		publishedYear: row.publishedYear,
		publishDate: row.publishedYear ? String(row.publishedYear) : null,
		isbn10: row.isbn10,
		isbn13: row.isbn13,
		translator: row.translator,
		description: null,
		notes: row.notes,
		series: null,
		covers: row.coverUrl ? [{ coverId: null, url: row.coverUrl }] : [],
		identifiers: {
			oclc: [],
			lccn: [],
			goodreads: [],
			librarything: [],
			ocaid: null,
		},
		openLibraryOlid: row.openLibraryOlid,
		linkedMemberKey,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		fromSnapshot: false,
	};
}

function coreFromOpenLibrary(
	full: OpenLibraryEditionFull,
	linked: MemberEditionRow | null,
): EditionCore {
	const languageCode = full.languageKeys[0]
		? normalizeLanguageCode(full.languageKeys[0])
		: (linked?.language ?? null);
	return {
		key: openLibraryEditionKey(full.olid),
		source: "open_library",
		verified: false,
		title: full.title,
		editionName: full.editionName,
		languageCode,
		language: languageCode ? formatEditionLanguage(languageCode) : null,
		format: formatLabelOf(full.physicalFormat) ?? formatLabelOf(linked?.format),
		pages: full.pages ?? linked?.pages ?? null,
		publishers: full.publishers.length
			? full.publishers
			: linked?.publisher
				? [linked.publisher]
				: [],
		publishPlaces: full.publishPlaces,
		publishedYear: full.publishedYear ?? linked?.publishedYear ?? null,
		publishDate: full.publishDate,
		isbn10: full.isbn10 ?? linked?.isbn10 ?? null,
		isbn13: full.isbn13 ?? linked?.isbn13 ?? null,
		translator: full.translator ?? linked?.translator ?? null,
		description: full.description,
		notes: linked?.notes ?? null,
		series: full.series,
		covers: [
			...full.covers.map((coverId) => ({ coverId, url: null })),
			...(linked?.coverUrl ? [{ coverId: null, url: linked.coverUrl }] : []),
		],
		identifiers: { ...full.identifiers, ocaid: full.ocaid },
		openLibraryOlid: full.olid,
		linkedMemberKey: linked ? `m-${linked.publicId}` : null,
		createdBy: linked?.createdBy ?? null,
		createdAt: linked?.createdAt ?? null,
		fromSnapshot: false,
	};
}

async function coreFromSnapshot(
	db: Database,
	book: BookRow,
	olid: string,
	linked: MemberEditionRow | null,
): Promise<EditionCore | null> {
	const snapshot = await db.editionSnapshot.findUnique({ where: { olid } });
	if (!snapshot || snapshot.bookId !== book.id) return null;
	const core = coreFromOpenLibrary(
		{
			olid,
			workOlid: book.olid,
			title: snapshot.title,
			subtitle: null,
			editionName: null,
			publishers: snapshot.publisher ? [snapshot.publisher] : [],
			publishPlaces: [],
			publishDate: snapshot.publishedYear
				? String(snapshot.publishedYear)
				: null,
			publishedYear: snapshot.publishedYear,
			pages: snapshot.pages,
			physicalFormat: snapshot.format,
			isbn10: null,
			isbn13: null,
			languageKeys: snapshot.language ? [snapshot.language] : [],
			covers: snapshot.coverId ? [snapshot.coverId] : [],
			description: null,
			series: null,
			translator: null,
			identifiers: { oclc: [], lccn: [], goodreads: [], librarything: [] },
			ocaid: null,
		},
		linked,
	);
	return { ...core, fromSnapshot: true };
}

/** An Open Library edition's core, from Open Library or, failing that, our saved copy. */
async function loadOpenLibraryCore(
	db: Database,
	book: BookRow,
	olid: string,
	context: UsageContext,
): Promise<{ core: EditionCore; full: OpenLibraryEditionFull | null } | null> {
	const linked =
		context.members.find((row) => row.openLibraryOlid === olid) ?? null;
	const full = await fetchOpenLibraryEditionFull(olid);
	if (full) {
		// An edition of another book is not found here.
		if (full.workOlid && full.workOlid !== book.olid) return null;
		const core = coreFromOpenLibrary(full, linked);
		if ((context.usage.get(core.key)?.readers.size ?? 0) > 0) {
			void saveEditionSnapshot(db, book.id, full);
		}
		return { core, full };
	}
	const fromSnapshot = await coreFromSnapshot(db, book, olid, linked);
	return fromSnapshot ? { core: fromSnapshot, full: null } : null;
}

/** The summary of one edition by key (a member edition, or an Open Library one). */
async function summaryForKey(
	db: Database,
	book: BookRow,
	key: string,
	context: UsageContext,
): Promise<EditionSummary | null> {
	const parsed = parseEditionKey(key);
	if (parsed?.kind === "member") {
		const row = context.byPublicId.get(parsed.publicId);
		return row ? summaryOf(memberSummarySource(row), context) : null;
	}
	if (parsed?.kind === "open_library") {
		const loaded = await loadOpenLibraryCore(db, book, parsed.olid, context);
		if (!loaded) return null;
		const { core } = loaded;
		return summaryOf(
			{
				key: core.key,
				source: "open_library",
				verified: false,
				title: core.title,
				publisher: core.publishers[0] ?? null,
				publishedYear: core.publishedYear,
				languageCode: core.languageCode,
				format: core.format,
				pages: core.pages,
				translator: core.translator,
				coverId: core.covers[0]?.coverId ?? null,
				coverUrl: core.covers[0]?.url ?? null,
			},
			context,
		);
	}
	return null;
}

/** Other editions of the book: ours and Open Library's, favourites and most read first. */
async function loadOthers(
	book: BookRow,
	currentKey: string,
	context: UsageContext,
): Promise<EditionSummary[]> {
	const summaries = new Map<string, EditionSummary>();
	for (const row of context.members) {
		const source = memberSummarySource(row);
		if (source.key === currentKey) continue;
		// A member edition linked to Open Library is shown as the Open Library one.
		if (row.openLibraryOlid) continue;
		summaries.set(source.key, summaryOf(source, context));
	}
	try {
		const listed = await listWorkEditions(book.olid, { limit: 24 });
		for (const item of listed.items) {
			const key = openLibraryEditionKey(item.editionId);
			if (key === currentKey || summaries.has(key)) continue;
			const languageCode = item.languageKeys[0]
				? normalizeLanguageCode(item.languageKeys[0])
				: null;
			const linked = context.members.find(
				(row) => row.openLibraryOlid === item.editionId,
			);
			summaries.set(
				key,
				summaryOf(
					{
						key,
						source: "open_library",
						verified: false,
						title: item.title,
						publisher: item.publishers[0] ?? linked?.publisher ?? null,
						publishedYear:
							yearFromPublishDate(item.publishDate) ??
							linked?.publishedYear ??
							null,
						languageCode,
						format: formatLabelOf(item.physicalFormat),
						pages: item.pages ?? linked?.pages ?? null,
						translator: linked?.translator ?? null,
						coverId: item.coverId,
						coverUrl: null,
					},
					context,
				),
			);
		}
	} catch {
		// Open Library being slow only means a shorter strip.
	}
	return [...summaries.values()]
		.sort(
			(a, b) =>
				Number(b.isClubFavourite) - Number(a.isClubFavourite) ||
				b.readers - a.readers ||
				Number(b.source === "member") - Number(a.source === "member") ||
				a.label.localeCompare(b.label),
		)
		.slice(0, OTHERS_LIMIT);
}

// ── Resolving the address ──────────────────────────────────────────────────

type Resolved =
	| { type: "open_library"; olid: string }
	| { type: "member"; row: MemberEditionRow }
	| { type: "redirect"; key: string }
	| { type: "removed" };

async function resolveKey(
	db: Database,
	book: BookRow,
	rawKey: string,
	context: UsageContext,
): Promise<Resolved> {
	const parsed = parseEditionKey(rawKey);
	if (!parsed)
		throw new ORPCError("NOT_FOUND", { message: "Edition not found" });

	if (parsed.kind === "open_library") {
		return { type: "open_library", olid: parsed.olid };
	}

	if (parsed.kind === "member") {
		const row = context.byPublicId.get(parsed.publicId);
		if (row) {
			return row.openLibraryOlid
				? { type: "redirect", key: openLibraryEditionKey(row.openLibraryOlid) }
				: { type: "member", row };
		}
		const tombstone = await db.editionTombstone.findUnique({
			where: { publicId: parsed.publicId },
		});
		if (tombstone && tombstone.bookId === book.id) {
			return tombstone.redirectKey
				? { type: "redirect", key: tombstone.redirectKey }
				: { type: "removed" };
		}
		throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
	}

	// An ISBN: ours first, then Open Library's (cached, so a bad ISBN is cheap).
	const memberMatch = context.members.find(
		(row) => row.isbn13 === parsed.isbn || row.isbn10 === parsed.isbn,
	);
	if (memberMatch) {
		return { type: "redirect", key: canonicalKeyOfMember(memberMatch) };
	}
	const found = await resolveOpenLibraryEditionByIsbn(parsed.isbn);
	if (found && (!found.workOlid || found.workOlid === book.olid)) {
		return { type: "redirect", key: openLibraryEditionKey(found.olid) };
	}
	throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
}

// ── edition.get ────────────────────────────────────────────────────────────

export async function getEdition(
	db: Database,
	bookSlug: string,
	rawKey: string,
): Promise<EditionLookup> {
	const book = await loadBook(db, bookSlug);
	const context = await loadUsageContext(db, book.id);
	const resolved = await resolveKey(db, book, rawKey, context);

	if (resolved.type === "redirect")
		return { kind: "redirect", key: resolved.key };
	if (resolved.type === "removed") {
		return { kind: "removed", bookSlug: book.slug, bookTitle: book.title };
	}

	let core: EditionCore;
	if (resolved.type === "member") {
		core = coreFromMember(resolved.row, null);
	} else {
		const loaded = await loadOpenLibraryCore(db, book, resolved.olid, context);
		if (!loaded)
			throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
		core = loaded.core;
	}

	const key = core.key;
	const usage = context.usage.get(key);
	const finishedIds = [...(usage?.finishedReaders ?? [])];
	const isbn = core.isbn13 ?? core.isbn10;

	const [others, rating, reviews, borrowable] = await Promise.all([
		loadOthers(book, key, context),
		finishedIds.length
			? db.feedback.aggregate({
					where: { bookId: book.id, authorId: { in: finishedIds } },
					_avg: { rating: true },
					_count: { _all: true },
				})
			: Promise.resolve(null),
		finishedIds.length
			? db.feedback.findMany({
					where: {
						bookId: book.id,
						authorId: { in: finishedIds },
						author: { ...visibleOnSiteUserWhere },
					},
					orderBy: { createdAt: "desc" },
					take: REVIEW_LIMIT,
					select: {
						slug: true,
						rating: true,
						review: true,
						isSpoiler: true,
						createdAt: true,
						author: { select: { username: true, name: true, image: true } },
					},
				})
			: Promise.resolve([]),
		core.identifiers.ocaid && isbn
			? fetchIsBorrowable(isbn)
			: Promise.resolve(null),
	]);

	// Compare with the club's most read edition (unless this is it).
	let baseline: EditionSummary | null = null;
	let differences: string[] = [];
	if (context.favouriteKey && context.favouriteKey !== key) {
		baseline = await summaryForKey(db, book, context.favouriteKey, context);
		if (baseline) {
			differences = differencesFrom(
				{
					pages: core.pages,
					language: core.language,
					format: core.format,
					publishedYear: core.publishedYear,
					translator: core.translator,
				},
				baseline,
			);
		}
	}

	return {
		kind: "ok",
		page: {
			book: {
				slug: book.slug,
				title: book.title,
				authors: book.authors,
				authorRefs: mapBookAuthorRefs(book.authorLinks),
				coverId: book.coverId,
				pages: book.pages,
			},
			edition: core,
			stats: {
				readingNow: usage?.readingNow.size ?? 0,
				finished: usage?.finishedReaders.size ?? 0,
				averageDaysToFinish: averageDays(usage),
				pagesPerDay: pagesPerDay(usage),
				bookRating: {
					average:
						rating?._avg.rating != null
							? Math.round(rating._avg.rating * 10) / 10
							: null,
					count: rating?._count._all ?? 0,
				},
			},
			compare: { baseline, differences },
			reviews: {
				total: rating?._count._all ?? 0,
				items: reviews.map((review) => ({
					slug: review.slug,
					rating: review.rating,
					// Spoilers never leave the server as text on a public page.
					excerpt: review.isSpoiler
						? ""
						: richContentPreview(review.review, 180),
					isSpoiler: review.isSpoiler,
					createdAt: review.createdAt,
					author: {
						username: review.author.username,
						name: review.author.name,
						image: review.author.image ?? null,
					},
				})),
			},
			others,
			isClubFavourite: context.favouriteKey === key,
			links: editionExternalLinks({
				olid: core.openLibraryOlid,
				isbn10: core.isbn10,
				isbn13: core.isbn13,
				ocaid: core.identifiers.ocaid,
				goodreads: core.identifiers.goodreads,
				librarything: core.identifiers.librarything,
				lccn: core.identifiers.lccn,
				borrowable,
			}),
		},
	};
}

// ── edition.readers / edition.viewer ───────────────────────────────────────

/** The usage filter for one canonical edition (an Open Library id and/or its member edition). */
async function usageFilter(db: Database, book: BookRow, rawKey: string) {
	const context = await loadUsageContext(db, book.id);
	const resolved = await resolveKey(db, book, rawKey, context);
	if (resolved.type !== "open_library" && resolved.type !== "member") {
		throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
	}
	const olid = resolved.type === "open_library" ? resolved.olid : null;
	const memberIds =
		resolved.type === "member"
			? [resolved.row.id]
			: context.members
					.filter((row) => row.openLibraryOlid === olid)
					.map((row) => row.id);
	return { olid, memberIds };
}

export async function getEditionReaders(
	db: Database,
	viewerId: string | null,
	bookSlug: string,
	rawKey: string,
): Promise<EditionReaders> {
	const book = await loadBook(db, bookSlug);
	const { olid, memberIds } = await usageFilter(db, book, rawKey);
	const readingMatch = [
		...(olid ? [{ editionOlid: olid }] : []),
		...(memberIds.length ? [{ bookEditionId: { in: memberIds } }] : []),
	];
	const readMatch = [
		...(olid ? [{ editionId: olid }] : []),
		...(memberIds.length ? [{ bookEditionId: { in: memberIds } }] : []),
	];
	const empty = { total: 0, items: [] };
	if (readingMatch.length === 0) {
		return { signedIn: viewerId != null, readingNow: empty, finished: empty };
	}

	const [readingRows, readRows] = await Promise.all([
		db.reading.findMany({
			where: {
				bookId: book.id,
				finishedAt: null,
				OR: readingMatch,
				user: { ...visibleOnSiteUserWhere },
			},
			orderBy: { startedAt: "desc" },
			select: {
				startedAt: true,
				percent: true,
				currentPage: true,
				totalPages: true,
				user: {
					select: {
						id: true,
						username: true,
						name: true,
						image: true,
						showCurrentlyReading: true,
						showReadingProgress: true,
					},
				},
			},
		}),
		db.read.findMany({
			where: {
				bookId: book.id,
				OR: readMatch,
				user: { ...visibleOnSiteUserWhere },
			},
			orderBy: [
				{ readEndYear: "desc" },
				{ readEndMonth: "desc" },
				{ updatedAt: "desc" },
			],
			take: 400,
			select: {
				readEndYear: true,
				readEndMonth: true,
				user: { select: { id: true, username: true, name: true, image: true } },
			},
		}),
	]);

	const signedIn = viewerId != null;
	return {
		signedIn,
		readingNow: {
			total: readingRows.length,
			items: signedIn
				? readingRows
						.filter(
							(row) =>
								row.user.showCurrentlyReading || row.user.id === viewerId,
						)
						.slice(0, READERS_LIMIT)
						.map((row) => {
							const isViewer = row.user.id === viewerId;
							const showProgress = isViewer || row.user.showReadingProgress;
							return {
								username: row.user.username,
								name: row.user.name,
								image: row.user.image ?? null,
								isViewer,
								startedAt: row.startedAt,
								percent: showProgress ? row.percent : null,
								currentPage: showProgress ? row.currentPage : null,
								totalPages: showProgress ? row.totalPages : null,
							};
						})
				: [],
		},
		finished: {
			total: readRows.length,
			items: signedIn
				? readRows.slice(0, READERS_LIMIT).map((row) => ({
						username: row.user.username,
						name: row.user.name,
						image: row.user.image ?? null,
						isViewer: row.user.id === viewerId,
						readEndYear: row.readEndYear,
						readEndMonth: row.readEndMonth,
					}))
				: [],
		},
	};
}

export async function getEditionViewer(
	db: Database,
	actor: Actor,
	bookSlug: string,
	rawKey: string,
): Promise<EditionViewer> {
	const book = await loadBook(db, bookSlug);
	const context = await loadUsageContext(db, book.id);
	const resolved = await resolveKey(db, book, rawKey, context);
	if (resolved.type !== "open_library" && resolved.type !== "member") {
		throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
	}
	const olid = resolved.type === "open_library" ? resolved.olid : null;
	const memberIds =
		resolved.type === "member"
			? [resolved.row.id]
			: context.members
					.filter((row) => row.openLibraryOlid === olid)
					.map((row) => row.id);
	const matches = (edition: {
		olid: string | null;
		bookEditionId: string | null;
	}) =>
		(olid != null && edition.olid === olid) ||
		(edition.bookEditionId != null &&
			memberIds.includes(edition.bookEditionId));

	const [reading, read] = await Promise.all([
		db.reading.findFirst({
			where: { userId: actor.id, bookId: book.id, finishedAt: null },
			select: { id: true, editionOlid: true, bookEditionId: true },
		}),
		db.read.findUnique({
			where: { userId_bookId: { userId: actor.id, bookId: book.id } },
			select: { editionId: true, bookEditionId: true },
		}),
	]);

	const member = resolved.type === "member" ? resolved.row : null;
	const usage = context.usage.get(
		member ? canonicalKeyOfMember(member) : openLibraryEditionKey(olid ?? ""),
	);
	const isCreator = member?.createdById === actor.id;
	return {
		signedIn: true,
		readingThis:
			reading != null &&
			matches({
				olid: reading.editionOlid,
				bookEditionId: reading.bookEditionId,
			}),
		readingId: reading?.id ?? null,
		readingOtherEdition:
			reading != null &&
			!matches({
				olid: reading.editionOlid,
				bookEditionId: reading.bookEditionId,
			}),
		readThis:
			read != null &&
			matches({ olid: read.editionId, bookEditionId: read.bookEditionId }),
		hasReadBook: read != null,
		canEdit: member != null && (actor.isAdmin || isCreator),
		canDelete:
			member != null &&
			(actor.isAdmin || (isCreator && (usage?.readers.size ?? 0) === 0)),
		isAdmin: actor.isAdmin,
	};
}

// ── edition.compare ────────────────────────────────────────────────────────

export async function compareEditions(
	db: Database,
	bookSlug: string,
	keys: string[],
): Promise<{ items: EditionSummary[] }> {
	const book = await loadBook(db, bookSlug);
	const context = await loadUsageContext(db, book.id);
	const items: EditionSummary[] = [];
	for (const raw of keys) {
		let resolved = await resolveKey(db, book, raw, context);
		if (resolved.type === "redirect") {
			const parsed = parseEditionKey(resolved.key);
			resolved =
				parsed?.kind === "open_library"
					? { type: "open_library", olid: parsed.olid }
					: parsed?.kind === "member" && context.byPublicId.get(parsed.publicId)
						? {
								type: "member",
								row: context.byPublicId.get(
									parsed.publicId,
								) as MemberEditionRow,
							}
						: { type: "removed" };
		}
		if (resolved.type === "removed") {
			throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
		}
		const key =
			resolved.type === "member"
				? canonicalKeyOfMember(resolved.row)
				: openLibraryEditionKey(resolved.olid);
		const summary = await summaryForKey(db, book, key, context);
		if (!summary)
			throw new ORPCError("NOT_FOUND", { message: "Edition not found" });
		items.push(summary);
	}
	return { items };
}
