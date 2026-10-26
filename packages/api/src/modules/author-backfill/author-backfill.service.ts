import type { Database, Prisma } from "@bbrc/db";
import { authorNameKey, authorNameToSlug } from "@bbrc/shared";
import {
	type AiAuthorInput,
	type AuthorAiRunner,
	aiWorthAsking,
	geminiAuthorAiRunner,
} from "../../lib/author-enrichment/ai";
import { applyAiFacts, enrichAuthor } from "../../lib/author-enrichment/enrich";
import {
	type Gathered,
	gatherAuthorFacts,
} from "../../lib/author-enrichment/gather";
import {
	type AuthorSources,
	defaultAuthorSources,
} from "../../lib/author-enrichment/sources";
import { mapWithConcurrency } from "../../lib/open-library/concurrency";
import {
	addAliases,
	createAuthor,
	findAuthorCandidates,
	setBookAuthors,
} from "../author-admin/author-core";
import { findMergeSuggestions } from "../author-admin/merge-suggestions";
import {
	type BackfillBook,
	chunk,
	clusterAuthorNames,
	mostCommon,
	type NameCluster,
	olidsToLookUp,
	pickOlidForName,
	startOfUtcDay,
} from "./cluster";

export const DEFAULT_BACKFILL_LIMIT = 25;
export const DEFAULT_BACKFILL_DAILY_CAP = 100;
export const AI_BATCH_SIZE = 20;
const NETWORK_CONCURRENCY = 3;
/** How many books of one author we look at to find their Open Library id. */
const WORKS_PER_AUTHOR = 3;

/** Stored on an author in `fieldMeta` when the backfill processed it (counts the day's cap). */
const BACKFILL_MARKER = "_backfill";

export type BackfillDeps = {
	sources?: AuthorSources;
	ai?: AuthorAiRunner | null;
	now?: () => Date;
};

// ── Loading ────────────────────────────────────────────────────────────────

async function loadUnlinkedBooks(db: Database): Promise<BackfillBook[]> {
	return db.book.findMany({
		where: { authorLinks: { none: {} } },
		select: {
			id: true,
			olid: true,
			slug: true,
			title: true,
			excerpt: true,
			authors: true,
		},
	});
}

/** The author an exact name (or alias) already points at, by normalised key. */
async function loadAuthorIdsByKey(
	db: Database,
	keys: readonly string[],
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	if (keys.length === 0) return map;
	const [authors, aliases] = await Promise.all([
		db.author.findMany({
			where: { nameKey: { in: [...keys] } },
			select: { id: true, nameKey: true },
		}),
		db.authorAlias.findMany({
			where: { key: { in: [...keys] } },
			select: { authorId: true, key: true },
		}),
	]);
	for (const row of aliases) map.set(row.key, row.authorId);
	for (const row of authors) map.set(row.nameKey, row.id);
	return map;
}

async function countProcessedSince(
	db: Database,
	since: string,
): Promise<number> {
	const rows = await db.$queryRaw<Array<{ count: bigint }>>`
		SELECT count(*)::bigint AS count FROM author
		WHERE field_meta -> ${BACKFILL_MARKER} ->> 'at' >= ${since}
	`;
	return Number(rows[0]?.count ?? 0);
}

async function markProcessed(
	db: Database,
	authorId: string,
	at: Date,
): Promise<void> {
	const author = await db.author.findUnique({
		where: { id: authorId },
		select: { fieldMeta: true },
	});
	if (!author) return;
	const meta = {
		...((author.fieldMeta ?? {}) as Record<string, unknown>),
		[BACKFILL_MARKER]: { at: at.toISOString() },
	};
	await db.author.update({
		where: { id: authorId },
		data: { fieldMeta: meta as Prisma.InputJsonValue },
	});
}

/** The old address of a merged spelling keeps working (links and post attachments may use it). */
async function ensureSlugRedirects(
	db: Database,
	authorId: string,
	authorSlug: string,
	names: readonly string[],
): Promise<void> {
	for (const name of names) {
		const slug = authorNameToSlug(name);
		if (slug === authorSlug) continue;
		const [author, redirect] = await Promise.all([
			db.author.findUnique({ where: { slug }, select: { id: true } }),
			db.authorSlugRedirect.findUnique({
				where: { slug },
				select: { slug: true },
			}),
		]);
		if (author || redirect) continue;
		await db.authorSlugRedirect.create({ data: { slug, authorId } });
	}
}

// ── Dry run ────────────────────────────────────────────────────────────────

export type BackfillPlan = {
	booksUnlinked: number;
	booksTotal: number;
	/** Distinct people by name, among books not linked yet. */
	authorsToCreate: number;
	/** Names that already match an author (their books just get linked). */
	authorsAlreadyKnown: number;
	/** Pairs of names (or with existing authors) that look alike: suggestions, never auto-merged. */
	lookAlikePairs: number;
	/** Upper bound: how many may need the AI (decided as the run goes, per author). */
	maxNeedAi: number;
	/** From a sample read of the sources (only with `probe`). */
	estimatedNeedAi: number | null;
	sampleSize: number;
	maxAiRequests: number;
	runsNeeded: number;
	dailyCap: number;
	daysNeeded: number;
};

/** A report of what a run would do. Writes nothing. `probe` reads a few authors from the sources to project the AI share. */
export async function planBackfill(
	input: {
		dailyCap?: number;
		limit?: number;
		probe?: boolean;
		sampleSize?: number;
	},
	db: Database,
	deps: BackfillDeps = {},
): Promise<BackfillPlan> {
	const sources = deps.sources ?? defaultAuthorSources;
	const dailyCap = input.dailyCap ?? DEFAULT_BACKFILL_DAILY_CAP;
	const limit = input.limit ?? DEFAULT_BACKFILL_LIMIT;

	const [books, booksTotal] = await Promise.all([
		loadUnlinkedBooks(db),
		db.book.count(),
	]);
	const clusters = clusterAuthorNames(books);
	const known = await loadAuthorIdsByKey(
		db,
		clusters.map((cluster) => cluster.key),
	);
	const fresh = clusters.filter((cluster) => !known.has(cluster.key));

	const existing = await db.author.findMany({
		select: {
			id: true,
			name: true,
			wikidataId: true,
			openLibraryId: true,
			status: true,
		},
	});
	const pairs = findMergeSuggestions([
		...existing.map((author) => ({
			id: author.id,
			name: author.name,
			wikidataId: author.wikidataId,
			openLibraryId: author.openLibraryId,
			verified: author.status === "verified",
		})),
		...fresh.map((cluster) => ({
			id: `new:${cluster.key}`,
			name: cluster.name,
			wikidataId: null,
			openLibraryId: null,
			verified: false,
		})),
	]).filter(
		(pair) => pair.aId.startsWith("new:") || pair.bId.startsWith("new:"),
	);

	let estimatedNeedAi: number | null = null;
	let sampleSize = 0;
	if (input.probe && fresh.length > 0) {
		const sample = fresh.slice(0, input.sampleSize ?? 10);
		sampleSize = sample.length;
		const gathered = await mapWithConcurrency(
			sample,
			NETWORK_CONCURRENCY,
			async (cluster) => {
				try {
					const found = await gatherForCluster(sources, cluster, books);
					return found.gathered;
				} catch {
					return null;
				}
			},
		);
		const needAi = gathered.filter(
			(entry) =>
				entry == null ||
				!entry.facts.some((fact) => fact.values.bio) ||
				!entry.facts.some((fact) => fact.values.birth?.year != null),
		).length;
		estimatedNeedAi = Math.round((needAi / sample.length) * fresh.length);
	}

	const perRun = Math.max(1, Math.min(limit, dailyCap));
	return {
		booksUnlinked: books.length,
		booksTotal,
		authorsToCreate: fresh.length,
		authorsAlreadyKnown: clusters.length - fresh.length,
		lookAlikePairs: pairs.length,
		maxNeedAi: fresh.length,
		estimatedNeedAi,
		sampleSize,
		maxAiRequests: Math.ceil(fresh.length / AI_BATCH_SIZE),
		runsNeeded: Math.ceil(fresh.length / perRun),
		dailyCap,
		daysNeeded: Math.ceil(fresh.length / Math.max(1, dailyCap)),
	};
}

// ── Reading the sources for one name ───────────────────────────────────────

async function gatherForCluster(
	sources: AuthorSources,
	cluster: NameCluster,
	books: readonly BackfillBook[],
): Promise<{ gathered: Gathered; olid: string | null }> {
	const byId = new Map(books.map((book) => [book.id, book]));
	const clusterBooks = cluster.bookIds
		.map((id) => byId.get(id))
		.filter((book): book is BackfillBook => book != null)
		.slice(0, WORKS_PER_AUTHOR);

	const picked: string[] = [];
	for (const book of clusterBooks) {
		try {
			const workOlids = await sources.openLibraryWorkAuthorIds(book.olid);
			const name =
				book.authors.find(
					(candidate) => authorNameKey(candidate) === cluster.key,
				) ?? cluster.name;
			const lookups = olidsToLookUp({
				bookNames: book.authors,
				name,
				workOlids,
			});
			const namesByOlid = new Map<string, string[]>();
			for (const olid of lookups) {
				const record = await sources.openLibraryAuthor(olid);
				if (record) {
					namesByOlid.set(olid, [record.name, ...record.alternateNames]);
				}
			}
			const olid = pickOlidForName({
				bookNames: book.authors,
				name,
				workOlids,
				namesByOlid,
			});
			if (olid) picked.push(olid);
		} catch {
			// One unreachable work must not sink the author.
		}
	}

	const olid = mostCommon(picked);
	// Exact mapping only: the name is never looked up on Open Library here.
	const gathered = await gatherAuthorFacts(sources, {
		name: cluster.name,
		openLibraryId: olid,
		searchByName: false,
	});
	return { gathered, olid };
}

// ── The run ────────────────────────────────────────────────────────────────

export type BackfillRunResult = {
	processedAuthors: number;
	createdAuthors: number;
	/** Names mapped onto an author by the same Open Library or Wikidata id. */
	mergedByIdentity: number;
	linkedToExistingAuthors: number;
	booksLinked: number;
	/** Books whose names copy changed because spellings were unified into one author name. */
	bookNamesUnified: number;
	aiRequests: number;
	aiFilledAuthors: number;
	/** New authors that look like an existing one (left separate, raised in the review queue). */
	lookAlikeAuthors: number;
	errors: string[];
	booksRemaining: number;
	authorsRemaining: number;
	processedToday: number;
	remainingToday: number;
	dailyCap: number;
	done: boolean;
};

type ClusterOutcome = {
	cluster: NameCluster;
	authorId: string;
	created: boolean;
	identity: boolean;
	lookAlike: boolean;
	leftover: AiAuthorInput | null;
};

export async function runBackfill(
	input: { limit?: number; dailyCap?: number },
	db: Database,
	deps: BackfillDeps = {},
): Promise<BackfillRunResult> {
	const sources = deps.sources ?? defaultAuthorSources;
	const ai = deps.ai === undefined ? geminiAuthorAiRunner : deps.ai;
	const now = deps.now ?? (() => new Date());
	const limit = input.limit ?? DEFAULT_BACKFILL_LIMIT;
	const dailyCap = input.dailyCap ?? DEFAULT_BACKFILL_DAILY_CAP;
	const errors: string[] = [];

	const books = await loadUnlinkedBooks(db);
	const clusters = clusterAuthorNames(books);
	const knownKeys = await loadAuthorIdsByKey(
		db,
		clusters.map((cluster) => cluster.key),
	);

	const processedBefore = await countProcessedSince(db, startOfUtcDay(now()));
	const remainingBefore = Math.max(0, dailyCap - processedBefore);
	const fresh = clusters.filter((cluster) => !knownKeys.has(cluster.key));
	const batch = fresh.slice(0, Math.min(limit, remainingBefore));

	// 1. Read the outside sources for the batch (parallel, a few at a time) before writing anything.
	const read = await mapWithConcurrency(
		batch,
		NETWORK_CONCURRENCY,
		async (cluster) => {
			try {
				return await gatherForCluster(sources, cluster, books);
			} catch (error) {
				errors.push(
					`${cluster.name}: ${error instanceof Error ? error.message : "could not read the sources"}`,
				);
				return null;
			}
		},
	);

	// 2. Create or find each author, one after another (so a shared Wikidata id is seen by the next).
	const outcomes: ClusterOutcome[] = [];
	for (const [index, cluster] of batch.entries()) {
		const entry = read[index];
		try {
			outcomes.push(
				await settleCluster(db, sources, cluster, entry ?? null, books, now()),
			);
		} catch (error) {
			errors.push(
				`${cluster.name}: ${error instanceof Error ? error.message : "failed"}`,
			);
		}
	}

	// 3. The AI for what is still empty, in batches, from the text we hold (never from memory).
	let aiRequests = 0;
	let aiFilledAuthors = 0;
	const leftovers = outcomes
		.map((outcome) => outcome.leftover)
		.filter(
			(item): item is AiAuthorInput => item != null && aiWorthAsking(item),
		);
	if (ai && leftovers.length > 0) {
		for (const group of chunk(leftovers, AI_BATCH_SIZE)) {
			try {
				aiRequests += 1;
				const facts = await ai(group);
				for (const item of group) {
					const found = facts.get(item.id);
					if (!found) continue;
					const changed = await applyAiFacts(db, item.id, found);
					if (changed.length > 0) aiFilledAuthors += 1;
				}
			} catch (error) {
				errors.push(
					`AI batch: ${error instanceof Error ? error.message : "failed"}`,
				);
			}
		}
	}

	// 4. Link every book whose names are all known authors now.
	const { booksLinked, bookNamesUnified } = await linkBooks(db, errors);

	const [stillUnlinked, status] = await Promise.all([
		loadUnlinkedBooks(db),
		getBackfillStatus({ dailyCap }, db, now),
	]);
	const remainingClusters = clusterAuthorNames(stillUnlinked);
	const remainingKnown = await loadAuthorIdsByKey(
		db,
		remainingClusters.map((cluster) => cluster.key),
	);

	return {
		processedAuthors: outcomes.length,
		createdAuthors: outcomes.filter((outcome) => outcome.created).length,
		mergedByIdentity: outcomes.filter((outcome) => outcome.identity).length,
		linkedToExistingAuthors: clusters.length - fresh.length,
		booksLinked,
		bookNamesUnified,
		aiRequests,
		aiFilledAuthors,
		lookAlikeAuthors: outcomes.filter((outcome) => outcome.lookAlike).length,
		errors,
		booksRemaining: stillUnlinked.length,
		authorsRemaining: remainingClusters.filter(
			(cluster) => !remainingKnown.has(cluster.key),
		).length,
		processedToday: status.processedToday,
		remainingToday: status.remainingToday,
		dailyCap,
		done: stillUnlinked.length === 0,
	};
}

/** Finds or creates the author for one name cluster and fills it from what was read. */
async function settleCluster(
	db: Database,
	sources: AuthorSources,
	cluster: NameCluster,
	entry: { gathered: Gathered; olid: string | null } | null,
	books: readonly BackfillBook[],
	at: Date,
): Promise<ClusterOutcome> {
	const gathered = entry?.gathered ?? null;
	const olid = gathered?.openLibraryId ?? null;
	const wikidataId = gathered?.wikidataId ?? null;

	const candidates = await findAuthorCandidates(db, {
		name: cluster.name,
		openLibraryId: olid,
		wikidataId,
	});
	// Identity is the only thing merged automatically: the same Open Library or Wikidata record.
	const sameRecord = candidates.find(
		(candidate) =>
			candidate.reason === "openlibrary_id" ||
			candidate.reason === "wikidata_id",
	);
	const sameName = candidates.find(
		(candidate) => candidate.reason === "alias" || candidate.reason === "name",
	);
	const lookAlike = !sameRecord && !sameName && candidates.length > 0;

	let authorId: string;
	let created = false;
	const identity = Boolean(sameRecord);

	const existing = sameRecord ?? sameName;
	if (existing) {
		authorId = existing.author.id;
		await addAliases(db, authorId, cluster.variants);
	} else {
		const result = await createAuthor(db, {
			name: cluster.name,
			openLibraryId: olid,
			wikidataId,
			// Alike-but-different spellings are separate records until an admin merges them.
			force: true,
		});
		authorId = result.author.id;
		created = result.created;
		await addAliases(db, authorId, cluster.variants.slice(1));
	}

	const author = await db.author.findUniqueOrThrow({
		where: { id: authorId },
		select: { slug: true, status: true },
	});
	await ensureSlugRedirects(db, authorId, author.slug, cluster.variants);

	let leftover: AiAuthorInput | null = null;
	if (created || identity) {
		const result = await enrichAuthor(db, authorId, {
			sources,
			ai: null,
			searchByName: false,
			gathered: gathered ?? undefined,
			bookContext: books
				.filter((book) => cluster.bookIds.includes(book.id))
				.map((book) => ({ title: book.title, excerpt: book.excerpt })),
		});
		if (result.stillEmpty.length > 0 && result.sourceText) {
			leftover = {
				id: authorId,
				name: cluster.name,
				wanted: result.stillEmpty,
				sourceText: result.sourceText,
			};
		}
	}

	if (lookAlike && created) {
		await db.author.update({
			where: { id: authorId },
			data: { status: "needs_review" },
		});
	}
	await markProcessed(db, authorId, at);

	return { cluster, authorId, created, identity, lookAlike, leftover };
}

/** Links books to authors when every name on the book maps to an author we have. */
async function linkBooks(
	db: Database,
	errors: string[],
): Promise<{ booksLinked: number; bookNamesUnified: number }> {
	const books = await loadUnlinkedBooks(db);
	const keys = [
		...new Set(
			books.flatMap((book) => book.authors.map((name) => authorNameKey(name))),
		),
	].filter(Boolean);
	const idByKey = await loadAuthorIdsByKey(db, keys);

	let booksLinked = 0;
	let bookNamesUnified = 0;
	for (const book of books) {
		if (book.authors.length === 0) continue;
		const ids: string[] = [];
		let complete = true;
		for (const name of book.authors) {
			const id = idByKey.get(authorNameKey(name));
			if (!id) {
				complete = false;
				break;
			}
			ids.push(id);
		}
		if (!complete) continue;
		try {
			const names = await db.$transaction(async (tx) => {
				await setBookAuthors(tx, book.id, ids);
				const row = await tx.book.findUniqueOrThrow({
					where: { id: book.id },
					select: { authors: true },
				});
				return row.authors;
			});
			booksLinked += 1;
			if (names.join("\u0000") !== book.authors.join("\u0000")) {
				bookNamesUnified += 1;
			}
		} catch (error) {
			errors.push(
				`${book.slug}: ${error instanceof Error ? error.message : "could not link"}`,
			);
		}
	}
	return { booksLinked, bookNamesUnified };
}

// ── Status and retry ───────────────────────────────────────────────────────

export type BackfillStatus = {
	booksTotal: number;
	booksLinked: number;
	booksUnlinked: number;
	authorsTotal: number;
	authorsAutoFilled: number;
	authorsNeedingReview: number;
	authorsFailed: number;
	authorsPending: number;
	processedToday: number;
	remainingToday: number;
	dailyCap: number;
	lastRunAt: Date | null;
};

export async function getBackfillStatus(
	input: { dailyCap?: number },
	db: Database,
	now: () => Date = () => new Date(),
): Promise<BackfillStatus> {
	const dailyCap = input.dailyCap ?? DEFAULT_BACKFILL_DAILY_CAP;
	const [
		booksTotal,
		booksUnlinked,
		authorsTotal,
		authorsAutoFilled,
		authorsNeedingReview,
		authorsFailed,
		authorsPending,
		processedToday,
		last,
	] = await Promise.all([
		db.book.count(),
		db.book.count({ where: { authorLinks: { none: {} } } }),
		db.author.count(),
		db.author.count({ where: { status: "auto" } }),
		db.author.count({ where: { status: "needs_review" } }),
		db.author.count({ where: { enrichmentStatus: "failed" } }),
		db.author.count({
			where: { enrichmentStatus: { in: ["pending", "running"] } },
		}),
		countProcessedSince(db, startOfUtcDay(now())),
		db.$queryRaw<Array<{ at: string | null }>>`
			SELECT max(field_meta -> ${BACKFILL_MARKER} ->> 'at') AS at FROM author
		`,
	]);
	const lastAt = last[0]?.at ?? null;
	return {
		booksTotal,
		booksLinked: booksTotal - booksUnlinked,
		booksUnlinked,
		authorsTotal,
		authorsAutoFilled,
		authorsNeedingReview,
		authorsFailed,
		authorsPending,
		processedToday,
		remainingToday: Math.max(0, dailyCap - processedToday),
		dailyCap,
		lastRunAt: lastAt ? new Date(lastAt) : null,
	};
}

/** Tries the authors whose enrichment failed once more (a hand-run retry resets their tries). */
export async function retryFailedAuthors(
	input: { limit?: number },
	db: Database,
	deps: BackfillDeps = {},
): Promise<{ retried: number; stillFailed: number }> {
	const rows = await db.author.findMany({
		where: { enrichmentStatus: "failed" },
		orderBy: { updatedAt: "asc" },
		take: input.limit ?? 25,
		select: { id: true },
	});
	let stillFailed = 0;
	for (const row of rows) {
		const result = await enrichAuthor(db, row.id, {
			sources: deps.sources,
			ai: deps.ai,
		});
		if (result.skipped) stillFailed += 1;
	}
	return { retried: rows.length, stillFailed };
}
