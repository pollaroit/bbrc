import type { Database, Prisma } from "@bbrc/db";
import type { AuthorFieldSource } from "@bbrc/shared";
import {
	type AiAuthorInput,
	type AuthorAiRunner,
	geminiAuthorAiRunner,
	prepareAiItem,
} from "../../lib/author-enrichment/ai";
import { resolveFields } from "../../lib/author-enrichment/fields";
import { gatherAuthorFacts } from "../../lib/author-enrichment/gather";
import {
	isOutdatedCountryCode,
	toModernCountryCodes,
} from "../../lib/author-enrichment/historical-states";
import {
	type AuthorSources,
	defaultAuthorSources,
} from "../../lib/author-enrichment/sources";
import { mapWithConcurrency } from "../../lib/open-library/concurrency";

export const DEFAULT_FIX_LIMIT = 300;
const FIX_CONCURRENCY = 8;
const FIX_BUDGET_MS = 70_000;
const AI_BATCH = 20;
const AI_PARALLEL = 3;
const SAMPLE_LIMIT = 60;

/** Stored in `fieldMeta` once an author was looked at, so the job can resume and never loops. */
const FIX_MARKER = "_nationalityFix";

export type FixNationalitiesDeps = {
	sources?: AuthorSources;
	ai?: AuthorAiRunner | null;
};

export type NationalityChange = {
	id: string;
	slug: string;
	name: string;
	before: string[];
	after: string[];
	source: AuthorFieldSource;
};

export type FixNationalitiesResult = {
	dryRun: boolean;
	/** Authors looked at in this call. */
	checked: number;
	changed: number;
	stillEmpty: number;
	/** Authors whose nationalities field an admin locked: never touched. */
	lockedSkipped: number;
	aiRequests: number;
	/** Authors still to look at (resumable: call again until `done`). */
	remaining: number;
	done: boolean;
	timedOut: boolean;
	/** What changed (all of it in a dry run, the first few otherwise). */
	samples: NationalityChange[];
};

type Row = {
	id: string;
	slug: string;
	name: string;
	nationalities: string[];
	fieldMeta: unknown;
	openLibraryId: string | null;
	wikidataId: string | null;
	wikipediaUrl: string | null;
};

/** Empty, or holding a code that is no country today. */
export function needsNationalityFix(nationalities: readonly string[]): boolean {
	return (
		nationalities.length === 0 ||
		nationalities.some((code) => isOutdatedCountryCode(code))
	);
}

function metaOf(row: Row): Record<string, unknown> {
	return (row.fieldMeta ?? {}) as Record<string, unknown>;
}

function isLocked(row: Row): boolean {
	const field = metaOf(row).nationalities as { locked?: boolean } | undefined;
	return field?.locked === true;
}

async function loadCandidates(db: Database): Promise<Row[]> {
	const rows = await db.author.findMany({
		select: {
			id: true,
			slug: true,
			name: true,
			nationalities: true,
			fieldMeta: true,
			openLibraryId: true,
			wikidataId: true,
			wikipediaUrl: true,
		},
		orderBy: { createdAt: "asc" },
	});
	return rows.filter((row) => needsNationalityFix(row.nationalities));
}

async function save(
	db: Database,
	row: Row,
	codes: string[],
	source: AuthorFieldSource,
	at: Date,
): Promise<void> {
	const meta = {
		...metaOf(row),
		nationalities: { source },
		[FIX_MARKER]: { at: at.toISOString() },
	};
	await db.author.update({
		where: { id: row.id },
		data: {
			nationalities: codes,
			fieldMeta: meta as Prisma.InputJsonValue,
		},
	});
}

async function mark(db: Database, row: Row, at: Date): Promise<void> {
	const meta = { ...metaOf(row), [FIX_MARKER]: { at: at.toISOString() } };
	await db.author.update({
		where: { id: row.id },
		data: { fieldMeta: meta as Prisma.InputJsonValue },
	});
}

/**
 * Re-derives nationalities (modern countries only) for authors whose list is empty or holds an
 * old code. Retired codes are mapped directly; the rest go through Open Library, Wikidata and
 * Wikipedia, then the AI in batches. Locked fields are never touched. Resumable: every author
 * looked at is marked, so repeated calls move on until `done`.
 */
export async function fixAuthorNationalities(
	input: { limit?: number; dryRun?: boolean; retryAttempted?: boolean },
	db: Database,
	deps: FixNationalitiesDeps = {},
): Promise<FixNationalitiesResult> {
	const sources = deps.sources ?? defaultAuthorSources;
	const ai = deps.ai === undefined ? geminiAuthorAiRunner : deps.ai;
	const dryRun = input.dryRun ?? false;
	const limit = input.limit ?? DEFAULT_FIX_LIMIT;
	const startedAt = Date.now();
	const deadline = startedAt + FIX_BUDGET_MS;
	const readDeadline = startedAt + FIX_BUDGET_MS * 0.6;
	const at = new Date();

	const candidates = await loadCandidates(db);
	const lockedSkipped = candidates.filter(isLocked).length;
	const open = candidates.filter((row) => !isLocked(row));
	const todo = open.filter(
		(row) => input.retryAttempted || metaOf(row)[FIX_MARKER] == null,
	);
	const batch = todo.slice(0, limit);

	const samples: NationalityChange[] = [];
	let changed = 0;
	let stillEmpty = 0;
	let checked = 0;
	let aiRequests = 0;
	const needAi: Array<{ row: Row; item: AiAuthorInput }> = [];

	const record = async (
		row: Row,
		after: string[],
		source: AuthorFieldSource,
	) => {
		changed += 1;
		if (samples.length < SAMPLE_LIMIT) {
			samples.push({
				id: row.id,
				slug: row.slug,
				name: row.name,
				before: row.nationalities,
				after,
				source,
			});
		}
		if (!dryRun) await save(db, row, after, source, at);
	};

	await mapWithConcurrency(batch, FIX_CONCURRENCY, async (row) => {
		if (Date.now() > readDeadline) return; // left for the next call
		checked += 1;
		try {
			// Retired codes (SU, YU, ...) map straight to today's country.
			if (row.nationalities.length > 0) {
				const mapped = toModernCountryCodes(row.nationalities);
				if (mapped.length > 0) {
					await record(row, mapped, "wikidata");
					return;
				}
			}
			const hasIds = Boolean(row.openLibraryId || row.wikidataId);
			const gathered = await gatherAuthorFacts(sources, {
				name: row.name,
				openLibraryId: row.openLibraryId,
				wikidataId: row.wikidataId,
				wikipediaUrl: row.wikipediaUrl,
				searchByName: !hasIds,
			});
			const found = resolveFields(gathered.facts).find(
				(field) => field.field === "nationalities",
			);
			if (found) {
				await record(row, found.value as string[], found.source);
				return;
			}
			const item = prepareAiItem({
				id: row.id,
				name: row.name,
				wanted: ["nationalities"],
				sourceText: gathered.sourceText,
			});
			if (item) needAi.push({ row, item });
			else {
				stillEmpty += 1;
				if (!dryRun) await mark(db, row, at);
			}
		} catch {
			stillEmpty += 1;
		}
	});

	// The AI, in batches of 20, a few at a time, for what the sources could not say.
	if (ai && needAi.length > 0) {
		const groups: Array<typeof needAi> = [];
		for (let i = 0; i < needAi.length; i += AI_BATCH) {
			groups.push(needAi.slice(i, i + AI_BATCH));
		}
		await mapWithConcurrency(groups, AI_PARALLEL, async (group) => {
			const settleEmpty = async (rows: typeof group) => {
				for (const { row } of rows) {
					stillEmpty += 1;
					if (!dryRun) await mark(db, row, at);
				}
			};
			if (deadline - Date.now() < 20_000) {
				// Not enough time for a model call: leave them for the next call.
				checked -= group.length;
				return;
			}
			try {
				aiRequests += 1;
				const facts = await ai(group.map((entry) => entry.item));
				const empty: typeof group = [];
				for (const entry of group) {
					const codes = facts.get(entry.row.id)?.nationalities;
					if (codes && codes.length > 0) {
						await record(entry.row, toModernCountryCodes(codes), "ai");
					} else {
						empty.push(entry);
					}
				}
				await settleEmpty(empty);
			} catch {
				checked -= group.length;
			}
		});
	} else {
		await mapWithConcurrency(needAi, 1, async ({ row }) => {
			stillEmpty += 1;
			if (!dryRun) await mark(db, row, at);
		});
	}

	const remaining = Math.max(0, todo.length - checked);
	return {
		dryRun,
		checked,
		changed,
		stillEmpty,
		lockedSkipped,
		aiRequests,
		remaining,
		done: remaining === 0,
		timedOut: Date.now() > deadline,
		samples,
	};
}
