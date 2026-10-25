import type { Database, Prisma } from "@bbrc/db";
import type { AuthorFieldMeta } from "@bbrc/shared";
import { addAliases } from "../../modules/author-admin/author-core";
import {
	type AiAuthorInput,
	type AuthorAiRunner,
	aiWorthAsking,
	geminiAuthorAiRunner,
} from "./ai";
import {
	type AuthorFieldColumns,
	ENRICHABLE_FIELDS,
	type EnrichableField,
	fieldsStillEmpty,
	planFieldPatch,
	resolveFields,
} from "./fields";
import { type Gathered, gatherAuthorFacts } from "./gather";
import type { AuthorFactValues } from "./parse";
import { type AuthorSources, defaultAuthorSources } from "./sources";

/** A "running" claim older than this is a crashed run, free to take over. */
const STALE_RUNNING_MS = 10 * 60_000;
export const MAX_ENRICHMENT_ATTEMPTS = 3;

export type EnrichOptions = {
	sources?: AuthorSources;
	/**
	 * Per-author AI for what is still empty (default: Gemini when configured).
	 * `null` skips it (the backfill collects those authors and asks in batches).
	 */
	ai?: AuthorAiRunner | null;
	mode?: "fill" | "refresh";
	only?: readonly EnrichableField[];
	/** Look the name up on Open Library when no id is known (default true). */
	searchByName?: boolean;
	/** Already read from the sources (the backfill reads once, before it writes). */
	gathered?: Gathered;
	/** Books by this author not linked yet (the backfill links after it fills), for the AI's source text. */
	bookContext?: ReadonlyArray<{ title: string; excerpt: string | null }>;
};

export type EnrichResult = {
	authorId: string;
	skipped: boolean;
	changed: EnrichableField[];
	/** Fields that stayed empty after the sources (candidates for the AI step). */
	stillEmpty: EnrichableField[];
	/** Text we hold for the AI step. */
	sourceText: string;
	status: "auto" | "needs_review" | "verified" | null;
};

const authorForEnrichment = {
	id: true,
	name: true,
	status: true,
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
	websiteUrl: true,
	openLibraryId: true,
	wikidataId: true,
	fieldMeta: true,
	enrichmentAttempts: true,
	books: {
		orderBy: { position: "asc" as const },
		take: 5,
		select: { book: { select: { title: true, excerpt: true } } },
	},
} satisfies Prisma.AuthorSelect;

type AuthorRow = Prisma.AuthorGetPayload<{
	select: typeof authorForEnrichment;
}>;

function columnsOf(author: AuthorRow): AuthorFieldColumns {
	return {
		bio: author.bio,
		bioSource: author.bioSource,
		birthYear: author.birthYear,
		birthMonth: author.birthMonth,
		birthDay: author.birthDay,
		deathYear: author.deathYear,
		deathMonth: author.deathMonth,
		deathDay: author.deathDay,
		birthPlace: author.birthPlace,
		deathPlace: author.deathPlace,
		nationalities: author.nationalities,
		gender: author.gender,
		wikipediaUrl: author.wikipediaUrl,
		goodreadsUrl: author.goodreadsUrl,
		websiteUrl: author.websiteUrl,
	};
}

/**
 * Source text for the AI: the outside text we gathered plus what OUR library says about the
 * books (their descriptions). Titles alone are not evidence, so with nothing else the text is empty
 * and the AI is not asked at all.
 */
export function aiSourceText(
	author: AuthorRow,
	gathered: Gathered,
	extraBooks: ReadonlyArray<{ title: string; excerpt: string | null }> = [],
): string {
	const parts = [gathered.sourceText];
	const books = [
		...author.books.map((link) => link.book),
		...extraBooks.filter(
			(extra) => !author.books.some((link) => link.book.title === extra.title),
		),
	];
	for (const book of books.slice(0, 3)) {
		const excerpt = book.excerpt?.trim();
		if (excerpt) {
			parts.push(
				`Description of “${book.title}” (a book by this author): ${excerpt.slice(0, 300)}`,
			);
		}
	}
	const evidence = parts.filter(Boolean).join("\n\n");
	if (!evidence) return "";
	const titles = books.map((book) => book.title);
	return titles.length > 0
		? `${evidence}\n\nBooks by this author in our library: ${titles.join("; ")}`
		: evidence;
}

/** A record with almost nothing behind it: a person should look. */
export function isThinAuthor(input: {
	bio: string | null;
	birthYear: number | null;
	wikidataId: string | null;
	openLibraryId: string | null;
}): boolean {
	return (
		!input.bio?.trim() &&
		input.birthYear == null &&
		!input.wikidataId &&
		!input.openLibraryId
	);
}

async function claim(db: Database, authorId: string): Promise<boolean> {
	const result = await db.author.updateMany({
		where: {
			id: authorId,
			OR: [
				{ enrichmentStatus: { not: "running" } },
				{ updatedAt: { lt: new Date(Date.now() - STALE_RUNNING_MS) } },
			],
		},
		data: { enrichmentStatus: "running" },
	});
	return result.count > 0;
}

function skipped(authorId: string): EnrichResult {
	return {
		authorId,
		skipped: true,
		changed: [],
		stillEmpty: [],
		sourceText: "",
		status: null,
	};
}

/**
 * Fills an author from Open Library → Wikidata → Wikipedia, then the AI for what is
 * still empty. Locked fields are never touched; every filled field records its source.
 * Safe to run twice. A failure is saved on the author (never thrown to the caller).
 */
export async function enrichAuthor(
	db: Database,
	authorId: string,
	options: EnrichOptions = {},
): Promise<EnrichResult> {
	const sources = options.sources ?? defaultAuthorSources;
	const mode = options.mode ?? "fill";
	const ai = options.ai === undefined ? geminiAuthorAiRunner : options.ai;

	if (!(await claim(db, authorId))) return skipped(authorId);

	try {
		const author = await db.author.findUnique({
			where: { id: authorId },
			select: authorForEnrichment,
		});
		if (!author) return skipped(authorId);

		const meta = (author.fieldMeta ?? {}) as AuthorFieldMeta;
		const current = columnsOf(author);

		const gathered =
			options.gathered ??
			(await gatherAuthorFacts(sources, {
				name: author.name,
				openLibraryId: author.openLibraryId,
				wikidataId: author.wikidataId,
				wikipediaUrl: author.wikipediaUrl,
				searchByName: options.searchByName ?? true,
			}));

		const resolved = resolveFields(gathered.facts);
		const first = planFieldPatch(current, meta, resolved, {
			mode,
			only: options.only,
		});

		let data: Partial<AuthorFieldColumns> = { ...first.data };
		let nextMeta = first.meta;
		const changed = new Set<EnrichableField>(first.changed);

		const sourceText = aiSourceText(author, gathered, options.bookContext);
		let stillEmpty = fieldsStillEmpty(current, data, nextMeta).filter(
			(field) => !options.only || options.only.includes(field),
		);

		if (ai && stillEmpty.length > 0) {
			const item: AiAuthorInput = {
				id: author.id,
				name: author.name,
				wanted: stillEmpty,
				sourceText,
			};
			if (aiWorthAsking(item)) {
				try {
					const facts = (await ai([item])).get(author.id);
					if (facts) {
						const plan = planFieldPatch(
							{ ...current, ...data },
							nextMeta,
							resolveFields([{ source: "ai", values: facts }]),
							{ mode: "fill", only: stillEmpty },
						);
						data = { ...data, ...plan.data };
						nextMeta = plan.meta;
						for (const field of plan.changed) changed.add(field);
						stillEmpty = fieldsStillEmpty(current, data, nextMeta);
					}
				} catch (error) {
					// The AI is a bonus: its failure must not fail the sources that worked.
					console.error("author AI step failed", author.id, error);
				}
			}
		}

		const olid = author.openLibraryId ?? gathered.openLibraryId;
		const wikidataId = author.wikidataId ?? gathered.wikidataId;

		// An Open Library record another author already holds is a duplicate: do not take it.
		let duplicateOf: string | null = null;
		let saveOlid = olid;
		if (olid && olid !== author.openLibraryId) {
			const holder = await db.author.findUnique({
				where: { openLibraryId: olid },
				select: { id: true, name: true },
			});
			if (holder && holder.id !== author.id) {
				duplicateOf = holder.name;
				saveOlid = author.openLibraryId;
			}
		}

		const merged = { ...current, ...data };
		const thin = isThinAuthor({
			bio: merged.bio,
			birthYear: merged.birthYear,
			wikidataId,
			openLibraryId: saveOlid,
		});
		const status =
			author.status === "verified"
				? "verified"
				: duplicateOf || thin
					? "needs_review"
					: author.status;

		await db.author.update({
			where: { id: author.id },
			data: {
				...data,
				fieldMeta: nextMeta as Prisma.InputJsonValue,
				openLibraryId: saveOlid,
				wikidataId,
				status,
				enrichmentStatus: "done",
				enrichmentAttempts: author.enrichmentAttempts + 1,
				enrichmentError: duplicateOf
					? `Same Open Library record as “${duplicateOf}”.`
					: null,
				enrichedAt: new Date(),
			},
		});

		const spellings = [
			...(gathered.openLibrary ? [gathered.openLibrary.name] : []),
			...gathered.alternateNames.slice(0, 8),
		];
		if (spellings.length > 0 && !duplicateOf) {
			await addAliases(db, author.id, spellings);
		}

		return {
			authorId: author.id,
			skipped: false,
			changed: [...changed],
			stillEmpty,
			sourceText,
			status,
		};
	} catch (error) {
		await markEnrichmentFailed(db, authorId, error);
		return skipped(authorId);
	}
}

export async function markEnrichmentFailed(
	db: Database,
	authorId: string,
	error: unknown,
): Promise<void> {
	const message = (
		error instanceof Error ? error.message : "Enrichment failed"
	).slice(0, 500);
	try {
		await db.author.update({
			where: { id: authorId },
			data: {
				enrichmentStatus: "failed",
				enrichmentAttempts: { increment: 1 },
				enrichmentError: message,
			},
		});
	} catch {
		// The author may be gone (merged); nothing to record.
	}
}

/**
 * Applies AI-found values to an author for fields that are still empty (the backfill's batched
 * AI step). Locks and existing values win; filled fields record source "ai".
 */
export async function applyAiFacts(
	db: Database,
	authorId: string,
	facts: AuthorFactValues,
): Promise<EnrichableField[]> {
	const author = await db.author.findUnique({
		where: { id: authorId },
		select: authorForEnrichment,
	});
	if (!author) return [];
	const meta = (author.fieldMeta ?? {}) as AuthorFieldMeta;
	const plan = planFieldPatch(
		columnsOf(author),
		meta,
		resolveFields([{ source: "ai", values: facts }]),
		{ mode: "fill" },
	);
	if (plan.changed.length === 0) return [];
	await db.author.update({
		where: { id: authorId },
		data: { ...plan.data, fieldMeta: plan.meta as Prisma.InputJsonValue },
	});
	return plan.changed;
}

/** The fields the AI may fill for an author right now (not locked, still empty). */
export function emptyEnrichableFields(
	author: AuthorFieldColumns,
	meta: AuthorFieldMeta,
): EnrichableField[] {
	return fieldsStillEmpty(author, {}, meta);
}

export { ENRICHABLE_FIELDS };
