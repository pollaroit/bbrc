import { createHash } from "node:crypto";
import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { getGeminiConfig } from "../../lib/gemini/config";
import { geminiGenerateJson } from "../../lib/gemini/generate-json";
import { mapWithConcurrency } from "../../lib/open-library/concurrency";
import {
	type OpenLibrarySearchHit,
	searchOpenLibraryWorks,
} from "../../lib/open-library/search";
import { loadBlockedOpenLibraryOlids } from "../book/book-recommendation-block.service";
import {
	AI_ASKS_PER_MEMBER_PER_DAY,
	type DiscoverItem,
	type DiscoverLane,
	type DiscoverLaneId,
} from "./book-discover.schema";

type Viewer = { id: string; isAdmin: boolean };

const LANE_COPY: Record<
	DiscoverLaneId,
	{ title: string; description: string; onDemand?: boolean }
> = {
	for_you: {
		title: "Suggested for you",
		description: "Based on the books you read, rated and favorited.",
	},
	series_next: {
		title: "Next in a series",
		description: "Later volumes of series the club has started.",
	},
	rated_authors: {
		title: "Authors the club rates highly",
		description: "More from the authors our members read and rate best.",
	},
	gaps: {
		title: "Fills a gap",
		description: "Countries and eras the library has few books from.",
	},
	member_wants: {
		title: "Members want this",
		description: "Open requests, ranked by how many members asked.",
	},
	ai: {
		title: "Ask AI",
		description: "A short, checked list based on the club's taste.",
		onDemand: true,
	},
};

export function listLanesFor(viewer: Viewer) {
	const ids: DiscoverLaneId[] = viewer.isAdmin
		? ["member_wants", "series_next", "rated_authors", "gaps", "ai"]
		: ["for_you", "ai"];
	return ids.map((id) => ({
		id,
		title: LANE_COPY[id].title,
		description: LANE_COPY[id].description,
		onDemand: Boolean(LANE_COPY[id].onDemand),
	}));
}

// ── Cache ──────────────────────────────────────────────────────────────────

const LANE_TTL_MS = 6 * 60 * 60 * 1000;
const AI_TTL_MS = 24 * 60 * 60 * 1000;

async function readCache<T>(db: Database, key: string): Promise<T | null> {
	const row = await db.bookDiscoverCache.findUnique({ where: { key } });
	if (!row || row.expiresAt.getTime() < Date.now()) return null;
	return row.payload as T;
}

async function writeCache(
	db: Database,
	key: string,
	payload: unknown,
	ttlMs: number,
) {
	const expiresAt = new Date(Date.now() + ttlMs);
	await db.bookDiscoverCache.upsert({
		where: { key },
		create: { key, payload: payload as never, expiresAt },
		update: { payload: payload as never, expiresAt },
	});
	// Keep the table small.
	await db.bookDiscoverCache.deleteMany({
		where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
	});
}

// ── Shared helpers ─────────────────────────────────────────────────────────

type Exclusions = { catalog: Set<string>; blocked: Set<string> };

async function loadExclusions(db: Database): Promise<Exclusions> {
	const [books, blocked] = await Promise.all([
		db.book.findMany({ select: { olid: true } }),
		loadBlockedOpenLibraryOlids(db),
	]);
	return { catalog: new Set(books.map((book) => book.olid)), blocked };
}

const allowed = (exclusions: Exclusions, olid: string) =>
	!exclusions.catalog.has(olid) && !exclusions.blocked.has(olid);

const norm = (value: string) =>
	value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();

function toItem(
	hit: OpenLibrarySearchHit,
	reason: string,
	request: DiscoverItem["request"] = null,
): DiscoverItem {
	return {
		olid: hit.olid,
		title: hit.title,
		authors: hit.authors,
		coverId: hit.coverId,
		publishedIn: hit.publishedIn,
		reason,
		request,
	};
}

function lane(
	id: DiscoverLaneId,
	items: DiscoverItem[],
	empty: string | null,
	asksLeft: number | null = null,
): DiscoverLane {
	return {
		id,
		title: LANE_COPY[id].title,
		description: LANE_COPY[id].description,
		items,
		empty:
			items.length === 0 ? (empty ?? "Nothing to suggest right now.") : null,
		asksLeft,
		generatedAt: new Date(),
	};
}

/** Adds hits that pass the exclusions, once each, up to `max`. */
function collect(
	into: DiscoverItem[],
	seen: Set<string>,
	hits: OpenLibrarySearchHit[],
	exclusions: Exclusions,
	reason: string,
	max: number,
	perCall = 2,
) {
	let added = 0;
	for (const hit of hits) {
		if (into.length >= max || added >= perCall) return;
		if (seen.has(hit.olid) || !allowed(exclusions, hit.olid)) continue;
		if (!hit.title.trim() || hit.authors.length === 0) continue;
		seen.add(hit.olid);
		into.push(toItem(hit, reason));
		added += 1;
	}
}

// ── Taste data ─────────────────────────────────────────────────────────────

type TasteBook = {
	title: string;
	authors: string[];
	subjects: string[];
	countries: string[];
	publishedIn: number;
	reads: number;
	rating: number | null;
	reviews: number;
};

/** Reads and club ratings per book, for the whole club or one member. */
async function loadTaste(
	db: Database,
	memberId?: string,
): Promise<TasteBook[]> {
	const books = await db.book.findMany({
		where: memberId
			? {
					OR: [
						{ reads: { some: { userId: memberId } } },
						{ favorites: { some: { userId: memberId } } },
						{ feedbacks: { some: { authorId: memberId } } },
					],
				}
			: { OR: [{ reads: { some: {} } }, { feedbacks: { some: {} } }] },
		select: {
			title: true,
			authors: true,
			subjects: true,
			countries: true,
			publishedIn: true,
			_count: { select: { reads: true } },
			feedbacks: {
				where: memberId ? { authorId: memberId } : undefined,
				select: { rating: true },
			},
		},
		take: 400,
	});
	return books.map((book) => {
		const ratings = book.feedbacks.map((feedback) => feedback.rating);
		return {
			title: book.title,
			authors: book.authors,
			subjects: book.subjects,
			countries: book.countries,
			publishedIn: book.publishedIn,
			reads: memberId ? 1 : book._count.reads,
			rating: ratings.length
				? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
				: null,
			reviews: ratings.length,
		};
	});
}

function topBy<T>(items: T[], score: (item: T) => number, count: number) {
	return [...items].sort((a, b) => score(b) - score(a)).slice(0, count);
}

type AuthorStat = {
	name: string;
	reads: number;
	rating: number | null;
	books: number;
};

function authorStats(taste: TasteBook[]): AuthorStat[] {
	const map = new Map<
		string,
		{
			name: string;
			reads: number;
			ratingSum: number;
			ratingN: number;
			books: number;
		}
	>();
	for (const book of taste) {
		const first = book.authors[0];
		if (!first) continue;
		const key = norm(first);
		const entry = map.get(key) ?? {
			name: first,
			reads: 0,
			ratingSum: 0,
			ratingN: 0,
			books: 0,
		};
		entry.reads += book.reads;
		entry.books += 1;
		if (book.rating != null) {
			entry.ratingSum += book.rating;
			entry.ratingN += 1;
		}
		map.set(key, entry);
	}
	return [...map.values()].map((entry) => ({
		name: entry.name,
		reads: entry.reads,
		books: entry.books,
		rating: entry.ratingN ? entry.ratingSum / entry.ratingN : null,
	}));
}

// ── Lanes ──────────────────────────────────────────────────────────────────

async function lanePersonal(db: Database, viewer: Viewer) {
	const [taste, exclusions, mine] = await Promise.all([
		loadTaste(db, viewer.id),
		loadExclusions(db),
		db.bookRequest.findMany({
			where: { userId: viewer.id, status: "pending" },
			select: { olid: true },
		}),
	]);
	for (const request of mine) exclusions.blocked.add(request.olid);
	if (taste.length === 0) {
		return lane(
			"for_you",
			[],
			"Mark a few books as read or favorite them and suggestions will appear here.",
		);
	}
	const items: DiscoverItem[] = [];
	const seen = new Set<string>();
	const authors = topBy(
		authorStats(taste),
		(stat) => stat.reads + (stat.rating ?? 3) * 2,
		4,
	);
	const results = await mapWithConcurrency(authors, 2, async (author) => ({
		author,
		hits: await searchOpenLibraryWorks(`author:"${author.name}"`, 10, {
			sort: "already_read",
		}).catch(() => []),
	}));
	for (const { author, hits } of results) {
		collect(
			items,
			seen,
			hits,
			exclusions,
			author.rating != null && author.rating >= 4
				? `You rated ${author.name} ${author.rating.toFixed(1)}★`
				: `More by ${author.name}, who you have read`,
			8,
		);
	}
	return lane("for_you", items, "No new books from your authors right now.");
}

async function laneRatedAuthors(db: Database) {
	const [taste, exclusions] = await Promise.all([
		loadTaste(db),
		loadExclusions(db),
	]);
	if (taste.length === 0)
		return lane("rated_authors", [], "Not enough reads yet.");
	const authors = topBy(
		authorStats(taste).filter(
			(stat) => stat.rating == null || stat.rating >= 3.5,
		),
		(stat) => stat.reads * 1 + (stat.rating ?? 3) * 3,
		5,
	);
	const results = await mapWithConcurrency(authors, 2, async (author) => ({
		author,
		hits: await searchOpenLibraryWorks(`author:"${author.name}"`, 10, {
			sort: "already_read",
		}).catch(() => []),
	}));
	const items: DiscoverItem[] = [];
	const seen = new Set<string>();
	for (const { author, hits } of results) {
		collect(
			items,
			seen,
			hits,
			exclusions,
			author.rating != null
				? `The club rates ${author.name} ${author.rating.toFixed(1)}★ across ${author.books} ${author.books === 1 ? "book" : "books"}`
				: `Members read ${author.name} ${author.reads} ${author.reads === 1 ? "time" : "times"}`,
			8,
		);
	}
	return lane("rated_authors", items, "No new books from those authors.");
}

async function laneSeriesNext(db: Database) {
	const [series, exclusions] = await Promise.all([
		db.series.findMany({
			select: {
				title: true,
				books: {
					orderBy: { position: "desc" },
					take: 1,
					select: {
						position: true,
						book: {
							select: {
								title: true,
								authors: true,
								_count: { select: { reads: true } },
							},
						},
					},
				},
			},
			take: 60,
		}),
		loadExclusions(db),
	]);
	// Series whose latest book somebody already read.
	const started = series
		.filter((row) => (row.books[0]?.book._count.reads ?? 0) > 0)
		.slice(0, 6);
	if (started.length === 0) {
		return lane(
			"series_next",
			[],
			"No series with a book the club has read yet.",
		);
	}
	const results = await mapWithConcurrency(started, 2, async (row) => {
		const last = row.books[0];
		const author = last?.book.authors[0];
		const query = author
			? `title:"${row.title}" author:"${author}"`
			: `title:"${row.title}"`;
		return {
			row,
			hits: await searchOpenLibraryWorks(query, 8, { sort: "old" }).catch(
				() => [],
			),
		};
	});
	const items: DiscoverItem[] = [];
	const seen = new Set<string>();
	for (const { row, hits } of results) {
		const last = row.books[0];
		collect(
			items,
			seen,
			hits,
			exclusions,
			`Continues ${row.title} after “${last?.book.title ?? "the last volume"}”`,
			8,
		);
	}
	return lane(
		"series_next",
		items,
		"No later volumes found for the series we have.",
	);
}

async function laneGaps(db: Database) {
	const [books, exclusions] = await Promise.all([
		db.book.findMany({ select: { countries: true, publishedIn: true } }),
		loadExclusions(db),
	]);
	if (books.length < 5) return lane("gaps", [], "Add a few more books first.");

	const byDecade = new Map<number, number>();
	for (const book of books) {
		const decade = Math.floor(book.publishedIn / 10) * 10;
		byDecade.set(decade, (byDecade.get(decade) ?? 0) + 1);
	}
	const byCountry = new Map<string, number>();
	for (const book of books) {
		for (const code of book.countries) {
			byCountry.set(code, (byCountry.get(code) ?? 0) + 1);
		}
	}

	// Eras between the oldest and newest book that have the fewest books.
	const decades = [...byDecade.keys()];
	const from = Math.max(1800, Math.min(...decades));
	const to = Math.max(...decades);
	const sparse: { decade: number; count: number }[] = [];
	for (let decade = from; decade <= to; decade += 10) {
		sparse.push({ decade, count: byDecade.get(decade) ?? 0 });
	}
	const eras = topBy(sparse, (entry) => -entry.count, 3);

	const regions = new Intl.DisplayNames(["en"], { type: "region" });
	const wanted = [
		"JP",
		"NG",
		"BR",
		"EG",
		"IN",
		"MX",
		"TR",
		"KR",
		"ZA",
		"CO",
		"AR",
		"IR",
	];
	const countries = topBy(
		wanted.map((code) => ({ code, count: byCountry.get(code) ?? 0 })),
		(entry) => -entry.count,
		3,
	);

	const queries = [
		...eras.map((era) => ({
			q: `first_publish_year:[${era.decade} TO ${era.decade + 9}] AND subject:fiction`,
			reason:
				era.count === 0
					? `We have no books from the ${era.decade}s`
					: `Only ${era.count} ${era.count === 1 ? "book" : "books"} from the ${era.decade}s`,
		})),
		...countries.map((entry) => {
			const name = regions.of(entry.code) ?? entry.code;
			return {
				q: `subject:"${name}" AND subject:fiction`,
				reason:
					entry.count === 0
						? `We have no books from ${name}`
						: `Only ${entry.count} ${entry.count === 1 ? "book" : "books"} from ${name}`,
			};
		}),
	];
	const results = await mapWithConcurrency(queries, 2, async (query) => ({
		query,
		hits: await searchOpenLibraryWorks(query.q, 12, {
			sort: "already_read",
		}).catch(() => []),
	}));
	const items: DiscoverItem[] = [];
	const seen = new Set<string>();
	for (const { query, hits } of results) {
		collect(items, seen, hits, exclusions, query.reason, 10, 2);
	}
	return lane("gaps", items, "No suggestions for the gaps right now.");
}

async function laneMemberWants(db: Database) {
	const rows = await db.bookRequest.findMany({
		where: { status: "pending" },
		orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "asc" }],
		take: 8,
		select: {
			id: true,
			olid: true,
			title: true,
			authors: true,
			note: true,
			_count: { select: { upvotes: true } },
			user: { select: { name: true, username: true } },
		},
	});
	const items: DiscoverItem[] = rows.map((row) => {
		const wants = row._count.upvotes + 1;
		const requester = row.user.name?.trim() || row.user.username;
		return {
			olid: row.olid,
			title: row.title?.trim() || row.olid,
			authors: row.authors,
			coverId: null,
			publishedIn: null,
			reason:
				wants > 1
					? `${wants} members want this${row.note ? ` · “${row.note}”` : ""}`
					: `Requested by ${requester}${row.note ? ` · “${row.note}”` : ""}`,
			request: {
				id: row.id,
				upvoteCount: row._count.upvotes,
				requester,
			},
		};
	});
	return lane("member_wants", items, "No open requests right now.");
}

// ── AI ─────────────────────────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `You suggest books for a small book club. You get a short summary of what the club (or one member) reads and rates.
Suggest exactly 8 real, published books that fit this taste and that are NOT in the summary.
Rules:
- Only real books you are sure exist; use the original title and the author's usual name.
- Vary authors, eras and countries; avoid more than one book per author.
- "reason" is one plain sentence (max 110 characters) that points at something in the summary.`;

const AI_RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		suggestions: {
			type: "array",
			items: {
				type: "object",
				properties: {
					title: { type: "string" },
					author: { type: "string" },
					reason: { type: "string" },
				},
				required: ["title", "author", "reason"],
			},
		},
	},
	required: ["suggestions"],
};

type AiDraft = {
	suggestions: { title: string; author: string; reason: string }[];
};

function parseAiDraft(value: unknown): AiDraft {
	const list = (value as { suggestions?: unknown })?.suggestions;
	if (!Array.isArray(list)) throw new Error("Gemini returned no suggestions");
	return {
		suggestions: list
			.map((entry) => entry as Record<string, unknown>)
			.filter(
				(entry) =>
					typeof entry.title === "string" && typeof entry.author === "string",
			)
			.map((entry) => ({
				title: String(entry.title).trim().slice(0, 200),
				author: String(entry.author).trim().slice(0, 120),
				reason: String(entry.reason ?? "")
					.trim()
					.slice(0, 140),
			}))
			.slice(0, 10),
	};
}

/**
 * A compact picture of the taste (about 600 to 800 tokens): top authors and
 * subjects, a few counts, and the most read and best rated titles. The catalog
 * is never sent; books the club already has are removed from the answer in code.
 */
function tasteSummary(taste: TasteBook[], who: string): string {
	const stats = authorStats(taste);
	const topAuthors = topBy(stats, (s) => s.reads + (s.rating ?? 3) * 2, 10)
		.map(
			(s) => `${s.name}${s.rating != null ? ` (${s.rating.toFixed(1)}★)` : ""}`,
		)
		.join("; ");

	const subjectCount = new Map<string, number>();
	const countryCount = new Map<string, number>();
	const decadeCount = new Map<number, number>();
	for (const book of taste) {
		for (const subject of book.subjects.slice(0, 5)) {
			subjectCount.set(subject, (subjectCount.get(subject) ?? 0) + book.reads);
		}
		for (const code of book.countries) {
			countryCount.set(code, (countryCount.get(code) ?? 0) + 1);
		}
		const decade = Math.floor(book.publishedIn / 10) * 10;
		decadeCount.set(decade, (decadeCount.get(decade) ?? 0) + 1);
	}
	const top = <K>(map: Map<K, number>, n: number) =>
		[...map.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, n)
			.map(([key, count]) => `${key} (${count})`)
			.join(", ");

	const mostRead = topBy(taste, (book) => book.reads, 8)
		.map((book) => `${book.title} – ${book.authors[0] ?? "?"}`)
		.join("; ");
	const bestRated = topBy(
		taste.filter((book) => book.rating != null && book.reviews >= 1),
		(book) => (book.rating ?? 0) * 10 + book.reviews,
		8,
	)
		.map(
			(book) =>
				`${book.title} – ${book.authors[0] ?? "?"} (${(book.rating ?? 0).toFixed(1)}★)`,
		)
		.join("; ");

	return [
		`Taste of ${who}.`,
		`Top authors: ${topAuthors || "none"}.`,
		`Top subjects: ${top(subjectCount, 10) || "none"}.`,
		`Countries of origin: ${top(countryCount, 8) || "none"}.`,
		`Decades: ${top(decadeCount, 6) || "none"}.`,
		`Most read: ${mostRead || "none"}.`,
		`Best rated: ${bestRated || "none"}.`,
	].join("\n");
}

async function aiAsksLeft(
	db: Database,
	viewer: Viewer,
): Promise<number | null> {
	if (viewer.isAdmin) return null;
	const used = await db.bookDiscoverAsk.count({
		where: {
			userId: viewer.id,
			createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		},
	});
	return Math.max(0, AI_ASKS_PER_MEMBER_PER_DAY - used);
}

async function laneAi(db: Database, viewer: Viewer, refresh: boolean) {
	const config = getGeminiConfig();
	if (!config) {
		return lane("ai", [], "AI suggestions are not set up on this server.");
	}
	const memberScope = viewer.isAdmin ? undefined : viewer.id;
	const taste = await loadTaste(db, memberScope);
	if (taste.length === 0) {
		return lane(
			"ai",
			[],
			viewer.isAdmin
				? "The club has no reads or reviews to learn from yet."
				: "Mark a few books as read first, then ask again.",
			await aiAsksLeft(db, viewer),
		);
	}

	const summary = tasteSummary(
		taste,
		viewer.isAdmin ? "the whole club" : "one member",
	);
	const cacheKey = `ai:${memberScope ?? "club"}:${createHash("sha256").update(summary).digest("hex").slice(0, 24)}`;

	if (!refresh) {
		const cached = await readCache<DiscoverLane>(db, cacheKey);
		if (cached) {
			return { ...cached, asksLeft: await aiAsksLeft(db, viewer) };
		}
	}

	const asksLeft = await aiAsksLeft(db, viewer);
	if (asksLeft != null && asksLeft <= 0) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: `You can ask AI ${AI_ASKS_PER_MEMBER_PER_DAY} times a day. Try again tomorrow.`,
		});
	}

	let draft: AiDraft;
	try {
		draft = await geminiGenerateJson({
			config,
			systemInstruction: AI_SYSTEM_PROMPT,
			userPrompt: summary,
			responseSchema: AI_RESPONSE_SCHEMA,
			parse: parseAiDraft,
			temperature: 0.7,
			timeoutMs: 25_000,
		});
	} catch (error) {
		throw new ORPCError("BAD_GATEWAY", {
			message: error instanceof Error ? error.message : "AI suggestion failed",
		});
	}
	if (!viewer.isAdmin) {
		await db.bookDiscoverAsk.create({ data: { userId: viewer.id } });
	}

	// Every pick must exist on Open Library and not already be in the library.
	const exclusions = await loadExclusions(db);
	const verified = await mapWithConcurrency(
		draft.suggestions,
		2,
		async (suggestion) => {
			const hits = await searchOpenLibraryWorks(
				`title:"${suggestion.title}" author:"${suggestion.author}"`,
				4,
				{ sort: "already_read" },
			).catch(() => []);
			const wantedTitle = norm(suggestion.title);
			const hit = hits.find(
				(candidate) =>
					norm(candidate.title) === wantedTitle ||
					norm(candidate.title).startsWith(wantedTitle) ||
					wantedTitle.startsWith(norm(candidate.title)),
			);
			return hit ? { hit, reason: suggestion.reason } : null;
		},
	);
	const items: DiscoverItem[] = [];
	const seen = new Set<string>();
	for (const entry of verified) {
		if (
			!entry ||
			seen.has(entry.hit.olid) ||
			!allowed(exclusions, entry.hit.olid)
		) {
			continue;
		}
		seen.add(entry.hit.olid);
		items.push(toItem(entry.hit, entry.reason || "Fits the taste summary"));
	}

	const result = lane(
		"ai",
		items,
		"AI had no new suggestions we could confirm. Try again later.",
		await aiAsksLeft(db, viewer),
	);
	if (items.length > 0) {
		await writeCache(db, cacheKey, result, AI_TTL_MS);
	}
	return result;
}

// ── Entry point ────────────────────────────────────────────────────────────

export async function getDiscoverLane(
	db: Database,
	viewer: Viewer,
	id: DiscoverLaneId,
	options: { refresh?: boolean } = {},
): Promise<DiscoverLane> {
	const allowedLanes = listLanesFor(viewer).map((entry) => entry.id);
	if (!allowedLanes.includes(id)) {
		throw new ORPCError("FORBIDDEN", { message: "That lane is not for you." });
	}
	if (id === "ai") {
		return laneAi(db, viewer, options.refresh === true);
	}
	if (id === "member_wants") {
		// Live data: no cache, it is a plain query.
		return laneMemberWants(db);
	}

	const key = id === "for_you" ? `lane:for_you:${viewer.id}` : `lane:${id}`;
	const cached = await readCache<DiscoverLane>(db, key);
	if (cached) return cached;

	const result =
		id === "for_you"
			? await lanePersonal(db, viewer)
			: id === "series_next"
				? await laneSeriesNext(db)
				: id === "rated_authors"
					? await laneRatedAuthors(db)
					: await laneGaps(db);
	if (result.items.length > 0) {
		await writeCache(db, key, result, LANE_TTL_MS);
	}
	return result;
}
