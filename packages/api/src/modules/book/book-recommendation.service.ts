import type { Database } from "@bbrc/db";
import { mapWithConcurrency } from "../../lib/open-library/concurrency";
import { OPEN_LIBRARY_FETCH } from "../../lib/open-library/constants";
import {
	type OpenLibrarySearchHit,
	searchOpenLibraryWorks,
} from "../../lib/open-library/search";
import { fetchWorkScoringMetadata } from "../../lib/open-library/work-scoring-metadata";
import type {
	BookRecommendationItem,
	RecommendationStreamEvent,
	RecommendOpenLibraryBooksOutput,
} from "./book-recommendation.schema";
import {
	CANDIDATE_POOL_LIMIT,
	OPEN_LIBRARY_SEARCH_LIMIT,
	RECOMMENDATION_CACHE_TTL_MS,
	RECOMMENDATION_MAX_WEIGHTED_SCORE,
	RECOMMENDATION_RESERVE_SIZE,
	RECOMMENDATION_RESULT_LIMIT,
	RECOMMENDATION_WEIGHTS,
	TOP_PROFILE_AUTHORS,
	TOP_PROFILE_SUBJECTS,
} from "./book-recommendation.weights";
import { loadBlockedOpenLibraryOlids } from "./book-recommendation-block.service";

type CatalogBookRow = {
	olid: string;
	authors: string[];
	subjects: string[];
	subjectPeople: string[];
	subjectTimes: string[];
	publishedIn: number;
};

type ProfileTerm = {
	weight: number;
	display: string;
};

type TermProfile = Map<string, ProfileTerm>;

type LibraryProfile = {
	authors: TermProfile;
	subjects: TermProfile;
	subjectPeople: TermProfile;
	subjectTimes: TermProfile;
	medianPublishedYear: number | null;
};

type ScoreBreakdown = {
	authors: number;
	subjects: number;
	subjectTimes: number;
	subjectPeople: number;
	publishedYear: number;
	openLibraryRating: number;
	total: number;
};

type ScoredCandidate = OpenLibrarySearchHit & {
	breakdown: ScoreBreakdown;
	reasons: string[];
};

type RecommendationContext = {
	catalogOlids: Set<string>;
	blockedOlids: Set<string>;
	profile: LibraryProfile;
	queries: string[];
	candidateHits: OpenLibrarySearchHit[];
	fromCache: boolean;
};

export function invalidateRecommendationCache(): void {
	contextCache.clear();
}

function recommendationExclusionOlids(
	context: RecommendationContext,
): Set<string> {
	return new Set([...context.catalogOlids, ...context.blockedOlids]);
}

type ContextCacheEntry = {
	expiresAt: number;
	context: RecommendationContext;
	reserveQueue: ScoredCandidate[];
};

const contextCache = new Map<string, ContextCacheEntry>();

function getCacheEntry(cacheKey: string): ContextCacheEntry | undefined {
	return contextCache.get(cacheKey);
}

function ensureCacheEntry(
	cacheKey: string,
	context: RecommendationContext,
	now: number,
): ContextCacheEntry {
	const existing = contextCache.get(cacheKey);
	if (existing) {
		existing.context = context;
		existing.expiresAt = now + RECOMMENDATION_CACHE_TTL_MS;
		return existing;
	}

	const created: ContextCacheEntry = {
		expiresAt: now + RECOMMENDATION_CACHE_TTL_MS,
		context,
		reserveQueue: [],
	};
	contextCache.set(cacheKey, created);
	return created;
}

function normalizeTerm(value: string): string {
	return value.trim().toLowerCase();
}

function incrementProfile(map: TermProfile, term: string, amount = 1): void {
	const trimmed = term.trim();
	const key = normalizeTerm(trimmed);
	if (!key) {
		return;
	}

	const existing = map.get(key);
	if (existing) {
		existing.weight += amount;
		return;
	}

	map.set(key, { weight: amount, display: trimmed });
}

function normalizeProfile(map: TermProfile): void {
	let max = 0;
	for (const entry of map.values()) {
		max = Math.max(max, entry.weight);
	}

	if (max <= 0) {
		return;
	}

	for (const entry of map.values()) {
		entry.weight /= max;
	}
}

function buildLibraryProfile(books: CatalogBookRow[]): LibraryProfile {
	const authors: TermProfile = new Map();
	const subjects: TermProfile = new Map();
	const subjectPeople: TermProfile = new Map();
	const subjectTimes: TermProfile = new Map();
	const years: number[] = [];

	for (const book of books) {
		years.push(book.publishedIn);

		for (const author of book.authors) {
			incrementProfile(authors, author);
		}
		for (const subject of book.subjects) {
			incrementProfile(subjects, subject);
		}
		for (const person of book.subjectPeople) {
			incrementProfile(subjectPeople, person);
		}
		for (const time of book.subjectTimes) {
			incrementProfile(subjectTimes, time);
		}
	}

	normalizeProfile(authors);
	normalizeProfile(subjects);
	normalizeProfile(subjectPeople);
	normalizeProfile(subjectTimes);

	const sortedYears = [...years].sort((a, b) => a - b);
	const medianPublishedYear =
		sortedYears.length === 0
			? null
			: (sortedYears[Math.floor(sortedYears.length / 2)] ?? null);

	return {
		authors,
		subjects,
		subjectPeople,
		subjectTimes,
		medianPublishedYear,
	};
}

function topProfileTerms(map: TermProfile, limit: number): string[] {
	return [...map.values()]
		.sort((a, b) => b.weight - a.weight)
		.slice(0, limit)
		.map((entry) => entry.display);
}

function overlapScore(terms: string[], profile: TermProfile): number {
	let sum = 0;

	for (const term of terms) {
		sum += profile.get(normalizeTerm(term))?.weight ?? 0;
	}

	return sum;
}

function yearScore(year: number | null, medianYear: number | null): number {
	if (year == null || medianYear == null) {
		return 0;
	}

	const diff = Math.abs(year - medianYear);
	if (diff <= 10) {
		return 1;
	}
	if (diff <= 25) {
		return 0.6;
	}
	if (diff <= 40) {
		return 0.3;
	}

	return 0.1;
}

function ratingScore(rating: number | null): number {
	if (rating == null || rating <= 0) {
		return 0;
	}

	return Math.min(rating / 5, 1);
}

function confidenceScoreFromTotal(total: number): number {
	if (total <= 0 || RECOMMENDATION_MAX_WEIGHTED_SCORE <= 0) {
		return 0;
	}

	const ratio = total / RECOMMENDATION_MAX_WEIGHTED_SCORE;
	return Math.min(99, Math.max(1, Math.round(ratio * 100)));
}

function buildReasons(breakdown: ScoreBreakdown): string[] {
	const entries: { weighted: number; text: string }[] = [
		{
			weighted: breakdown.authors * RECOMMENDATION_WEIGHTS.authors,
			text: "Similar authors",
		},
		{
			weighted: breakdown.subjects * RECOMMENDATION_WEIGHTS.subjects,
			text: "Matching subjects",
		},
		{
			weighted: breakdown.publishedYear * RECOMMENDATION_WEIGHTS.publishedYear,
			text: "Similar publication era",
		},
		{
			weighted: breakdown.subjectTimes * RECOMMENDATION_WEIGHTS.subjectTimes,
			text: "Related time periods",
		},
		{
			weighted: breakdown.subjectPeople * RECOMMENDATION_WEIGHTS.subjectPeople,
			text: "Related people & themes",
		},
	];

	return entries
		.filter((entry) => entry.weighted > 0.05)
		.sort((a, b) => b.weighted - a.weighted)
		.slice(0, 3)
		.map((entry) => entry.text);
}

function scoreCandidate(
	hit: OpenLibrarySearchHit,
	profile: LibraryProfile,
	metadata: Awaited<ReturnType<typeof fetchWorkScoringMetadata>>,
): ScoredCandidate {
	const authors = overlapScore(hit.authors, profile.authors);
	const subjects = overlapScore(metadata.subjects, profile.subjects);
	const subjectTimes = overlapScore(
		metadata.subjectTimes,
		profile.subjectTimes,
	);
	const subjectPeople = overlapScore(
		metadata.subjectPeople,
		profile.subjectPeople,
	);
	const publishedYear = yearScore(hit.publishedIn, profile.medianPublishedYear);
	const openLibraryRating = ratingScore(metadata.openLibraryRating);

	const breakdown: ScoreBreakdown = {
		authors,
		subjects,
		subjectTimes,
		subjectPeople,
		publishedYear,
		openLibraryRating,
		total:
			authors * RECOMMENDATION_WEIGHTS.authors +
			subjects * RECOMMENDATION_WEIGHTS.subjects +
			subjectTimes * RECOMMENDATION_WEIGHTS.subjectTimes +
			subjectPeople * RECOMMENDATION_WEIGHTS.subjectPeople +
			publishedYear * RECOMMENDATION_WEIGHTS.publishedYear +
			openLibraryRating * RECOMMENDATION_WEIGHTS.openLibraryRating,
	};

	return {
		...hit,
		breakdown,
		reasons: buildReasons(breakdown),
	};
}

function toRecommendationItem(scored: ScoredCandidate): BookRecommendationItem {
	return {
		olid: scored.olid,
		title: scored.title,
		authors: scored.authors,
		coverId: scored.coverId,
		publishedIn: scored.publishedIn,
		reasons:
			scored.reasons.length > 0 ? scored.reasons : ["Matches club library"],
		confidenceScore: confidenceScoreFromTotal(scored.breakdown.total),
	};
}

function preliminaryScore(
	hit: OpenLibrarySearchHit,
	profile: LibraryProfile,
): number {
	const authors = overlapScore(hit.authors, profile.authors);
	const publishedYear = yearScore(hit.publishedIn, profile.medianPublishedYear);

	return (
		authors * RECOMMENDATION_WEIGHTS.authors +
		publishedYear * RECOMMENDATION_WEIGHTS.publishedYear
	);
}

function buildSearchQueries(profile: LibraryProfile): string[] {
	const queries: string[] = [];

	for (const author of topProfileTerms(profile.authors, TOP_PROFILE_AUTHORS)) {
		queries.push(`author_name:"${author.replaceAll('"', "")}"`);
	}

	for (const subject of topProfileTerms(
		profile.subjects,
		TOP_PROFILE_SUBJECTS,
	)) {
		queries.push(`subject:"${subject.replaceAll('"', "")}"`);
	}

	return queries;
}

async function collectCandidates(
	queries: string[],
	blockOlids: Set<string>,
): Promise<OpenLibrarySearchHit[]> {
	const byOlid = new Map<string, OpenLibrarySearchHit>();

	const resultGroups = await mapWithConcurrency(
		queries,
		OPEN_LIBRARY_FETCH.searchConcurrency,
		(query) => searchOpenLibraryWorks(query, OPEN_LIBRARY_SEARCH_LIMIT),
	);

	for (const hits of resultGroups) {
		for (const hit of hits) {
			if (blockOlids.has(hit.olid)) {
				continue;
			}

			if (!byOlid.has(hit.olid)) {
				byOlid.set(hit.olid, hit);
			}

			if (byOlid.size >= CANDIDATE_POOL_LIMIT) {
				return [...byOlid.values()];
			}
		}
	}

	return [...byOlid.values()];
}

async function recommendationCacheKey(db: Database): Promise<string> {
	const [books, blocks] = await Promise.all([
		db.book.aggregate({ _count: true, _max: { updatedAt: true } }),
		db.blockedOpenLibraryWork.aggregate({
			_count: true,
			_max: { createdAt: true },
		}),
	]);

	return [
		`b:${books._count}:${books._max.updatedAt?.getTime() ?? 0}`,
		`blk:${blocks._count}:${blocks._max.createdAt?.getTime() ?? 0}`,
	].join(":");
}

async function loadRecommendationContext(
	db: Database,
): Promise<RecommendationContext | null> {
	const [books, blockedOlids] = await Promise.all([
		db.book.findMany({
			select: {
				olid: true,
				authors: true,
				subjects: true,
				subjectPeople: true,
				subjectTimes: true,
				publishedIn: true,
			},
		}),
		loadBlockedOpenLibraryOlids(db),
	]);

	if (books.length === 0) {
		return null;
	}

	const cacheKey = await recommendationCacheKey(db);
	const now = Date.now();
	const cached = contextCache.get(cacheKey);

	if (cached && cached.expiresAt > now) {
		return { ...cached.context, fromCache: true };
	}

	const catalogOlids = new Set(books.map((book) => book.olid));
	const profile = buildLibraryProfile(books);
	const queries = buildSearchQueries(profile);

	if (queries.length === 0) {
		return null;
	}

	const candidateHits = await collectCandidates(
		queries,
		new Set([...catalogOlids, ...blockedOlids]),
	);

	if (candidateHits.length === 0) {
		return null;
	}

	const context: RecommendationContext = {
		catalogOlids,
		blockedOlids,
		profile,
		queries,
		candidateHits,
		fromCache: false,
	};

	ensureCacheEntry(cacheKey, context, now);

	for (const [key, entry] of contextCache.entries()) {
		if (entry.expiresAt <= now && key !== cacheKey) {
			contextCache.delete(key);
		}
	}

	return context;
}

async function buildReserveQueue(
	context: RecommendationContext,
	excludeOlids: Set<string>,
	targetSize: number,
): Promise<ScoredCandidate[]> {
	const exclude = new Set([
		...excludeOlids,
		...recommendationExclusionOlids(context),
	]);
	const reserve: ScoredCandidate[] = [];

	for (const hit of orderedCandidateHits(context, exclude)) {
		if (reserve.length >= targetSize) {
			break;
		}

		const metadata = await fetchWorkScoringMetadata(hit.workKey);
		const scored = scoreCandidate(hit, context.profile, metadata);

		if (scored.breakdown.total <= 0) {
			continue;
		}

		reserve.push(scored);
		exclude.add(scored.olid);
	}

	return reserve.sort((a, b) => b.breakdown.total - a.breakdown.total);
}

function primaryAuthorKey(hit: { authors: string[] }): string | null {
	return hit.authors[0] ? normalizeTerm(hit.authors[0]) : null;
}

function pickFromReserve(
	reserveQueue: ScoredCandidate[],
	excludeOlids: Set<string>,
	usedPrimaryAuthors: Set<string>,
): { picked: ScoredCandidate | null; remaining: ScoredCandidate[] } {
	for (let index = 0; index < reserveQueue.length; index += 1) {
		const candidate = reserveQueue[index];
		if (!candidate) {
			continue;
		}

		if (excludeOlids.has(candidate.olid)) {
			continue;
		}

		const primary = primaryAuthorKey(candidate);
		if (primary && usedPrimaryAuthors.has(primary)) {
			continue;
		}

		return {
			picked: candidate,
			remaining: [
				...reserveQueue.slice(0, index),
				...reserveQueue.slice(index + 1),
			],
		};
	}

	return { picked: null, remaining: reserveQueue };
}

function orderedCandidateHits(
	context: RecommendationContext,
	excludeOlids: Set<string>,
): OpenLibrarySearchHit[] {
	return context.candidateHits
		.filter((hit) => !excludeOlids.has(hit.olid))
		.sort(
			(a, b) =>
				preliminaryScore(b, context.profile) -
				preliminaryScore(a, context.profile),
		);
}

async function pickNextRecommendation(
	context: RecommendationContext,
	excludeOlids: Set<string>,
	usedPrimaryAuthors: Set<string>,
): Promise<ScoredCandidate | null> {
	for (const hit of orderedCandidateHits(context, excludeOlids)) {
		const primaryAuthor = hit.authors[0] ? normalizeTerm(hit.authors[0]) : null;

		if (primaryAuthor && usedPrimaryAuthors.has(primaryAuthor)) {
			continue;
		}

		const metadata = await fetchWorkScoringMetadata(hit.workKey);
		const scored = scoreCandidate(hit, context.profile, metadata);

		if (scored.breakdown.total <= 0) {
			continue;
		}

		if (primaryAuthor) {
			usedPrimaryAuthors.add(primaryAuthor);
		}

		return scored;
	}

	const blockOlids = new Set([
		...recommendationExclusionOlids(context),
		...excludeOlids,
	]);
	const extraHits = await collectCandidates(context.queries, blockOlids);

	for (const hit of extraHits.sort(
		(a, b) =>
			preliminaryScore(b, context.profile) -
			preliminaryScore(a, context.profile),
	)) {
		if (excludeOlids.has(hit.olid)) {
			continue;
		}

		const primaryAuthor = hit.authors[0] ? normalizeTerm(hit.authors[0]) : null;

		if (primaryAuthor && usedPrimaryAuthors.has(primaryAuthor)) {
			continue;
		}

		const metadata = await fetchWorkScoringMetadata(hit.workKey);
		const scored = scoreCandidate(hit, context.profile, metadata);

		if (scored.breakdown.total <= 0) {
			continue;
		}

		context.candidateHits.push(hit);

		if (primaryAuthor) {
			usedPrimaryAuthors.add(primaryAuthor);
		}

		return scored;
	}

	return null;
}

export async function listCatalogOlids(db: Database): Promise<string[]> {
	const rows = await db.book.findMany({ select: { olid: true } });
	return rows.map((row) => row.olid);
}

export async function* streamBookRecommendations(
	db: Database,
	limit = RECOMMENDATION_RESULT_LIMIT,
): AsyncGenerator<RecommendationStreamEvent> {
	const context = await loadRecommendationContext(db);

	if (!context) {
		yield {
			type: "meta",
			catalogOlids: await listCatalogOlids(db),
			cached: false,
		};
		yield { type: "done" };
		return;
	}

	yield {
		type: "meta",
		catalogOlids: [...context.catalogOlids],
		cached: context.fromCache,
	};

	const excludeOlids = new Set<string>();
	const usedPrimaryAuthors = new Set<string>();
	let yielded = 0;

	while (yielded < limit) {
		const scored = await pickNextRecommendation(
			context,
			excludeOlids,
			usedPrimaryAuthors,
		);

		if (!scored) {
			break;
		}

		excludeOlids.add(scored.olid);
		yielded += 1;
		yield { type: "item", item: toRecommendationItem(scored) };
	}

	const cacheKey = await recommendationCacheKey(db);
	const cacheEntry = getCacheEntry(cacheKey);
	if (cacheEntry) {
		cacheEntry.reserveQueue = await buildReserveQueue(
			context,
			excludeOlids,
			RECOMMENDATION_RESERVE_SIZE,
		);
	}

	yield { type: "done" };
}

export async function replaceBookRecommendation(
	db: Database,
	input: {
		rejectOlid: string;
		visibleOlids: string[];
		sessionExcludedOlids: string[];
	},
): Promise<BookRecommendationItem | null> {
	const context = await loadRecommendationContext(db);

	if (!context) {
		return null;
	}

	const cacheKey = await recommendationCacheKey(db);
	const cacheEntry = getCacheEntry(cacheKey);

	const exclude = new Set([
		...recommendationExclusionOlids(context),
		...input.sessionExcludedOlids,
		...input.visibleOlids,
	]);
	const usedPrimaryAuthors = new Set<string>();

	for (const olid of input.visibleOlids) {
		if (olid === input.rejectOlid) {
			continue;
		}

		const hit =
			context.candidateHits.find((row) => row.olid === olid) ??
			cacheEntry?.reserveQueue.find((row) => row.olid === olid);

		const primary = hit ? primaryAuthorKey(hit) : null;
		if (primary) {
			usedPrimaryAuthors.add(primary);
		}
	}
	let reserveQueue = cacheEntry?.reserveQueue ?? [];

	const fromReserve = pickFromReserve(
		reserveQueue,
		exclude,
		usedPrimaryAuthors,
	);
	reserveQueue = fromReserve.remaining;

	let scored = fromReserve.picked;

	if (!scored) {
		scored = await pickNextRecommendation(context, exclude, usedPrimaryAuthors);
	}

	if (!scored) {
		return null;
	}

	if (cacheEntry) {
		cacheEntry.reserveQueue = reserveQueue.filter(
			(row) => row.olid !== scored.olid,
		);

		if (cacheEntry.reserveQueue.length < RECOMMENDATION_RESERVE_SIZE / 2) {
			const topUpExclude = new Set([
				...exclude,
				scored.olid,
				...cacheEntry.reserveQueue.map((row) => row.olid),
			]);
			const topUp = await buildReserveQueue(
				context,
				topUpExclude,
				RECOMMENDATION_RESERVE_SIZE - cacheEntry.reserveQueue.length,
			);
			cacheEntry.reserveQueue = [...cacheEntry.reserveQueue, ...topUp].sort(
				(a, b) => b.breakdown.total - a.breakdown.total,
			);
		}
	}

	return toRecommendationItem(scored);
}

export async function recommendOpenLibraryBooks(
	db: Database,
): Promise<RecommendOpenLibraryBooksOutput> {
	const items: BookRecommendationItem[] = [];
	let cached = false;

	for await (const event of streamBookRecommendations(db)) {
		if (event.type === "meta") {
			cached = event.cached;
		}
		if (event.type === "item") {
			items.push(event.item);
		}
	}

	return { items, cached };
}
