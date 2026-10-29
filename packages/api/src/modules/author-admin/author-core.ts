import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import {
	type AuthorFieldMeta,
	authorNameKey,
	authorNameSimilarity,
	generateUniqueSlug,
	LIKELY_SAME_AUTHOR_SCORE,
	UniqueSlugError,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { ENRICHABLE_FIELDS } from "../../lib/author-enrichment/fields";
import { sortNameFor } from "../../lib/author-enrichment/parse";

type Db = Database | DatabaseTransaction;

export const authorSummarySelect = {
	id: true,
	slug: true,
	name: true,
	photoUrl: true,
	birthYear: true,
	deathYear: true,
	nationalities: true,
	status: true,
	openLibraryId: true,
	wikidataId: true,
	_count: { select: { books: true } },
} satisfies Prisma.AuthorSelect;

type AuthorSummaryRow = Prisma.AuthorGetPayload<{
	select: typeof authorSummarySelect;
}>;

export type AuthorSummary = {
	id: string;
	slug: string;
	name: string;
	photoUrl: string | null;
	birthYear: number | null;
	deathYear: number | null;
	nationalities: string[];
	status: "verified" | "auto" | "needs_review";
	openLibraryId: string | null;
	wikidataId: string | null;
	bookCount: number;
};

export function toAuthorSummary(row: AuthorSummaryRow): AuthorSummary {
	const { _count, ...rest } = row;
	return { ...rest, bookCount: _count.books };
}

export type CandidateReason =
	| "openlibrary_id"
	| "wikidata_id"
	| "alias"
	| "name"
	| "similar";

const REASON_RANK: Record<CandidateReason, number> = {
	openlibrary_id: 0,
	wikidata_id: 1,
	alias: 2,
	name: 3,
	similar: 4,
};

export type AuthorCandidate = {
	author: AuthorSummary;
	reason: CandidateReason;
	/** 1 for an identity match, else the name similarity. */
	score: number;
	/** The spelling that matched (an alias, say). */
	matchedName: string | null;
};

export function isStrongReason(reason: CandidateReason): boolean {
	return reason !== "similar";
}

export function normalizeAuthorName(name: string): string {
	return name.replace(/\s+/g, " ").trim();
}

/**
 * Who in our library could this author already be? Strongest signals first: the same
 * Open Library id, the same Wikidata id, an alias, the same normalised name, then a
 * name that is merely very alike (spelling variants such as Dostoyevsky / Dostoevski).
 */
export async function findAuthorCandidates(
	db: Db,
	input: {
		name: string;
		openLibraryId?: string | null;
		wikidataId?: string | null;
	},
): Promise<AuthorCandidate[]> {
	const name = normalizeAuthorName(input.name);
	const key = authorNameKey(name);
	const found = new Map<string, AuthorCandidate>();

	const add = (
		row: AuthorSummaryRow,
		reason: CandidateReason,
		score: number,
		matchedName: string | null,
	) => {
		const existing = found.get(row.id);
		const candidate = {
			author: toAuthorSummary(row),
			reason,
			score,
			matchedName,
		};
		if (
			!existing ||
			REASON_RANK[reason] < REASON_RANK[existing.reason] ||
			(reason === existing.reason && score > existing.score)
		) {
			found.set(row.id, candidate);
		}
	};

	if (input.openLibraryId) {
		const row = await db.author.findUnique({
			where: { openLibraryId: input.openLibraryId },
			select: authorSummarySelect,
		});
		if (row) add(row, "openlibrary_id", 1, null);
	}

	if (input.wikidataId) {
		const rows = await db.author.findMany({
			where: { wikidataId: input.wikidataId },
			select: authorSummarySelect,
		});
		for (const row of rows) add(row, "wikidata_id", 1, null);
	}

	if (key) {
		const alias = await db.authorAlias.findUnique({
			where: { key },
			select: { alias: true, author: { select: authorSummarySelect } },
		});
		if (alias) add(alias.author, "alias", 1, alias.alias);

		const sameKey = await db.author.findMany({
			where: { nameKey: key },
			select: authorSummarySelect,
		});
		for (const row of sameKey) add(row, "name", 1, row.name);
	}

	if (key) {
		const [authors, aliases] = await Promise.all([
			db.author.findMany({ select: { id: true, name: true } }),
			db.authorAlias.findMany({ select: { alias: true, authorId: true } }),
		]);
		const best = new Map<string, { score: number; matched: string }>();
		const consider = (authorId: string, label: string) => {
			if (found.has(authorId)) return;
			const score = authorNameSimilarity(name, label);
			if (score < LIKELY_SAME_AUTHOR_SCORE) return;
			const current = best.get(authorId);
			if (!current || score > current.score) {
				best.set(authorId, { score, matched: label });
			}
		};
		for (const author of authors) consider(author.id, author.name);
		for (const alias of aliases) consider(alias.authorId, alias.alias);

		if (best.size > 0) {
			const rows = await db.author.findMany({
				where: { id: { in: [...best.keys()] } },
				select: authorSummarySelect,
			});
			for (const row of rows) {
				const hit = best.get(row.id);
				if (hit) add(row, "similar", hit.score, hit.matched);
			}
		}
	}

	return [...found.values()].sort(
		(a, b) =>
			REASON_RANK[a.reason] - REASON_RANK[b.reason] ||
			b.score - a.score ||
			b.author.bookCount - a.author.bookCount,
	);
}

async function isSlugFree(db: Db, slug: string): Promise<boolean> {
	const [author, redirect] = await Promise.all([
		db.author.findUnique({ where: { slug }, select: { id: true } }),
		db.authorSlugRedirect.findUnique({
			where: { slug },
			select: { slug: true },
		}),
	]);
	return author == null && redirect == null;
}

/** The address of a new author: what the app always made from the name, plus a digit when taken. */
export async function generateAuthorSlug(
	db: Db,
	name: string,
): Promise<string> {
	try {
		return await generateUniqueSlug(name, (slug) => isSlugFree(db, slug));
	} catch (error) {
		if (!(error instanceof UniqueSlugError)) throw error;
		const base = authorNameKey(name).replace(/\s+/g, "_") || "author";
		return `${base.slice(0, 50)}_${crypto.randomUUID().slice(0, 6)}`.replace(
			/__+/g,
			"_",
		);
	}
}

export type CreateAuthorInput = {
	name: string;
	openLibraryId?: string | null;
	wikidataId?: string | null;
	createdById?: string | null;
	/** "Different person": create even when the name is taken or alike. */
	force?: boolean;
};

export type CreateAuthorResult = {
	author: AuthorSummary;
	created: boolean;
	/** Why an existing author was returned instead of a new one. */
	match: CandidateReason | null;
	/** Other authors that look alike (shown as "Looks like …"). */
	possibleDuplicates: AuthorCandidate[];
};

/**
 * Creates an author by name, unless the library already has them. It never silently makes a
 * near-duplicate: an identical or alike author is returned with `created: false`, and
 * `force: true` ("different person") is the explicit way past that.
 */
export async function createAuthor(
	db: Db,
	input: CreateAuthorInput,
): Promise<CreateAuthorResult> {
	const name = normalizeAuthorName(input.name);
	if (!name) {
		throw new ORPCError("BAD_REQUEST", { message: "An author needs a name." });
	}

	const candidates = await findAuthorCandidates(db, {
		name,
		openLibraryId: input.openLibraryId,
		wikidataId: input.wikidataId,
	});

	// The same Open Library record is the same person, always (the column is unique anyway).
	const sameRecord = candidates.find((c) => c.reason === "openlibrary_id");
	if (sameRecord) {
		return {
			author: sameRecord.author,
			created: false,
			match: sameRecord.reason,
			possibleDuplicates: candidates.filter((c) => c !== sameRecord),
		};
	}

	if (!input.force && candidates.length > 0) {
		const [best, ...rest] = candidates;
		if (best) {
			return {
				author: best.author,
				created: false,
				match: best.reason,
				possibleDuplicates: rest,
			};
		}
	}

	for (let attempt = 0; attempt < 3; attempt++) {
		const slug = await generateAuthorSlug(db, name);
		try {
			const row = await db.author.create({
				data: {
					slug,
					name,
					nameKey: authorNameKey(name),
					sortName: sortNameFor(name),
					openLibraryId: input.openLibraryId ?? null,
					wikidataId: input.wikidataId ?? null,
					createdById: input.createdById ?? null,
					status: "auto",
					enrichmentStatus: "pending",
					fieldMeta: {},
				},
				select: authorSummarySelect,
			});
			return {
				author: toAuthorSummary(row),
				created: true,
				match: null,
				possibleDuplicates: candidates,
			};
		} catch (error) {
			const code = (error as { code?: string }).code;
			if (code !== "P2002" || attempt === 2) throw error;
		}
	}
	throw new ORPCError("CONFLICT", { message: "Could not create the author." });
}

/** The author an address points at, following merge redirects. */
export async function findAuthorBySlugOrRedirect(
	db: Db,
	slug: string,
): Promise<{ id: string; slug: string; name: string } | null> {
	const direct = await db.author.findUnique({
		where: { slug },
		select: { id: true, slug: true, name: true },
	});
	if (direct) return direct;
	const redirect = await db.authorSlugRedirect.findUnique({
		where: { slug },
		select: { author: { select: { id: true, slug: true, name: true } } },
	});
	return redirect?.author ?? null;
}

/**
 * Makes `authorIds` (in order) the authors of a book and rewrites `Book.authors`
 * (the names copy) in the same go. Call inside the transaction that changes the book.
 */
export async function setBookAuthors(
	db: Db,
	bookId: string,
	authorIds: readonly string[],
): Promise<string[]> {
	const ids = [...new Set(authorIds)];
	const rows = await db.author.findMany({
		where: { id: { in: ids } },
		select: { id: true, name: true },
	});
	const byId = new Map(rows.map((row) => [row.id, row.name]));
	const known = ids.filter((id) => byId.has(id));
	if (known.length !== ids.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One of the authors no longer exists.",
		});
	}

	await db.bookAuthor.deleteMany({ where: { bookId } });
	if (known.length > 0) {
		await db.bookAuthor.createMany({
			data: known.map((authorId, position) => ({ bookId, authorId, position })),
		});
	}
	await db.book.update({
		where: { id: bookId },
		data: { authors: known.map((id) => byId.get(id) as string) },
	});
	return known;
}

/** Rewrites `Book.authors` from the join for these books (after a rename, merge or delete). */
export async function syncBookAuthorNames(
	db: Db,
	bookIds: readonly string[],
): Promise<void> {
	for (const bookId of bookIds) {
		const links = await db.bookAuthor.findMany({
			where: { bookId },
			orderBy: { position: "asc" },
			select: { author: { select: { name: true } } },
		});
		await db.book.update({
			where: { id: bookId },
			data: { authors: links.map((link) => link.author.name) },
		});
	}
}

export type ResolvedNames = {
	authorIds: string[];
	createdIds: string[];
};

/**
 * Turns names into authors: an existing one by name, alias or likely spelling variant,
 * or a new one. Used where only names exist (older callers, the backfill's leftovers).
 */
export async function resolveAuthorsByNames(
	db: Db,
	names: readonly string[],
	options: { createdById?: string | null } = {},
): Promise<ResolvedNames> {
	const authorIds: string[] = [];
	const createdIds: string[] = [];
	for (const raw of names) {
		const name = normalizeAuthorName(raw);
		if (!name) continue;
		const result = await createAuthor(db, {
			name,
			createdById: options.createdById,
		});
		if (!authorIds.includes(result.author.id)) authorIds.push(result.author.id);
		if (result.created) createdIds.push(result.author.id);
	}
	return { authorIds, createdIds };
}

/** Adds spellings as aliases of an author, skipping ones that belong to anybody already. */
export async function addAliases(
	db: Db,
	authorId: string,
	names: readonly string[],
): Promise<number> {
	const author = await db.author.findUnique({
		where: { id: authorId },
		select: { nameKey: true },
	});
	if (!author) return 0;
	let added = 0;
	const seen = new Set<string>([author.nameKey]);
	for (const raw of names) {
		const alias = normalizeAuthorName(raw);
		const key = authorNameKey(alias);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		const [taken, authorWithName] = await Promise.all([
			db.authorAlias.findUnique({ where: { key }, select: { id: true } }),
			db.author.findFirst({
				where: { nameKey: key },
				select: { id: true },
			}),
		]);
		if (taken || authorWithName) continue;
		await db.authorAlias.create({ data: { authorId, alias, key } });
		added += 1;
	}
	return added;
}

export type MergeResult = {
	into: AuthorSummary;
	movedBooks: number;
	movedFollowers: number;
	bookSlugs: string[];
};

/**
 * Folds one author into another: books, aliases (and the old name as an alias),
 * followers (once each), post references and the old address (it now redirects).
 * Fields the kept author lacks are copied from the other one; locked fields stay as they are.
 */
export async function mergeAuthors(
	db: Database,
	fromId: string,
	intoId: string,
): Promise<MergeResult> {
	if (fromId === intoId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Choose two different authors.",
		});
	}

	return db.$transaction(async (tx) => {
		const [from, into] = await Promise.all([
			tx.author.findUnique({ where: { id: fromId } }),
			tx.author.findUnique({ where: { id: intoId } }),
		]);
		if (!from || !into) {
			throw new ORPCError("NOT_FOUND", { message: "Author not found." });
		}

		const fromLinks = await tx.bookAuthor.findMany({
			where: { authorId: from.id },
			select: { bookId: true, book: { select: { slug: true } } },
		});
		const intoBookIds = new Set(
			(
				await tx.bookAuthor.findMany({
					where: { authorId: into.id },
					select: { bookId: true },
				})
			).map((row) => row.bookId),
		);
		const movable = fromLinks.filter((link) => !intoBookIds.has(link.bookId));
		await tx.bookAuthor.deleteMany({
			where: { authorId: from.id, bookId: { in: [...intoBookIds] } },
		});
		if (movable.length > 0) {
			await tx.bookAuthor.updateMany({
				where: {
					authorId: from.id,
					bookId: { in: movable.map((link) => link.bookId) },
				},
				data: { authorId: into.id },
			});
		}

		// Followers once each.
		const intoFollowers = new Set(
			(
				await tx.follow.findMany({
					where: { authorId: into.id },
					select: { followerId: true },
				})
			).map((row) => row.followerId),
		);
		await tx.follow.deleteMany({
			where: { authorId: from.id, followerId: { in: [...intoFollowers] } },
		});
		const movedFollowers = await tx.follow.updateMany({
			where: { authorId: from.id },
			data: { authorId: into.id },
		});

		await tx.authorAlias.updateMany({
			where: { authorId: from.id },
			data: { authorId: into.id },
		});
		await tx.authorSlugRedirect.updateMany({
			where: { authorId: from.id },
			data: { authorId: into.id },
		});
		await tx.postAttachment.updateMany({
			where: { authorSlug: from.slug },
			data: { authorSlug: into.slug, authorName: into.name },
		});
		// Tierlist items follow the kept author; a list that already has both keeps one.
		const keptInTierlists = await tx.postTierlistItem.findMany({
			where: { authorId: into.id },
			select: { tierlistId: true },
		});
		await tx.postTierlistItem.deleteMany({
			where: {
				authorId: from.id,
				tierlistId: { in: keptInTierlists.map((row) => row.tierlistId) },
			},
		});
		await tx.postTierlistItem.updateMany({
			where: { authorId: from.id },
			data: {
				authorId: into.id,
				label: into.name,
				dedupeKey: `author:${into.id}`,
			},
		});

		// The merged author's own fields only fill what the kept one lacks.
		const intoMeta = (into.fieldMeta ?? {}) as AuthorFieldMeta;
		const fromMeta = (from.fieldMeta ?? {}) as AuthorFieldMeta;
		const fill: Prisma.AuthorUpdateInput = {};
		const nextMeta: AuthorFieldMeta = { ...intoMeta };
		const empty = (field: (typeof ENRICHABLE_FIELDS)[number]) => {
			switch (field) {
				case "birth":
					return into.birthYear == null;
				case "death":
					return into.deathYear == null;
				case "nationalities":
					return into.nationalities.length === 0;
				case "gender":
					return into.gender === "unknown";
				case "bio":
					return !into.bio?.trim();
				default:
					return !into[field];
			}
		};
		for (const field of ENRICHABLE_FIELDS) {
			if (intoMeta[field]?.locked || !empty(field)) continue;
			switch (field) {
				case "birth":
					if (from.birthYear == null) continue;
					fill.birthYear = from.birthYear;
					fill.birthMonth = from.birthMonth;
					fill.birthDay = from.birthDay;
					break;
				case "death":
					if (from.deathYear == null) continue;
					fill.deathYear = from.deathYear;
					fill.deathMonth = from.deathMonth;
					fill.deathDay = from.deathDay;
					break;
				case "nationalities":
					if (from.nationalities.length === 0) continue;
					fill.nationalities = from.nationalities;
					break;
				case "gender":
					if (from.gender === "unknown") continue;
					fill.gender = from.gender;
					break;
				case "bio":
					if (!from.bio?.trim()) continue;
					fill.bio = from.bio;
					fill.bioSource = from.bioSource;
					break;
				default: {
					const value = from[field];
					if (!value) continue;
					fill[field] = value;
				}
			}
			const source = fromMeta[field]?.source;
			if (source) nextMeta[field] = { source };
		}
		if (!into.photoUrl && from.photoUrl) {
			fill.photoUrl = from.photoUrl;
			fill.photoCredit = from.photoCredit;
			fill.photoLicense = from.photoLicense;
			fill.photoSourceUrl = from.photoSourceUrl;
			if (fromMeta.photo) nextMeta.photo = { source: fromMeta.photo.source };
		}
		const takeOpenLibraryId = !into.openLibraryId && from.openLibraryId;
		const takeWikidataId = !into.wikidataId && from.wikidataId;

		// The old name becomes an alias of the kept author (unless it is the same name).
		const oldKey = from.nameKey;
		const oldKeyTaken =
			oldKey === into.nameKey ||
			(await tx.authorAlias.findUnique({ where: { key: oldKey } })) != null;

		await tx.author.delete({ where: { id: from.id } });

		if (!oldKeyTaken) {
			await tx.authorAlias.create({
				data: { authorId: into.id, alias: from.name, key: oldKey },
			});
		}
		await tx.authorSlugRedirect.upsert({
			where: { slug: from.slug },
			create: { slug: from.slug, authorId: into.id },
			update: { authorId: into.id },
		});

		await tx.author.update({
			where: { id: into.id },
			data: {
				...fill,
				fieldMeta: nextMeta as Prisma.InputJsonValue,
				...(takeOpenLibraryId ? { openLibraryId: from.openLibraryId } : {}),
				...(takeWikidataId ? { wikidataId: from.wikidataId } : {}),
			},
		});

		await syncBookAuthorNames(tx, [...fromLinks.map((link) => link.bookId)]);

		const summary = await tx.author.findUniqueOrThrow({
			where: { id: into.id },
			select: authorSummarySelect,
		});
		return {
			into: toAuthorSummary(summary),
			movedBooks: movable.length,
			movedFollowers: movedFollowers.count,
			bookSlugs: fromLinks.map((link) => link.book.slug),
		};
	});
}

/** Only an author with no books can be deleted (otherwise merge). */
export async function deleteAuthorRecord(db: Db, id: string): Promise<void> {
	const author = await db.author.findUnique({
		where: { id },
		select: { id: true, _count: { select: { books: true } } },
	});
	if (!author) {
		throw new ORPCError("NOT_FOUND", { message: "Author not found." });
	}
	if (author._count.books > 0) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"This author still has books. Merge them into another author instead.",
			data: { bookCount: author._count.books },
		});
	}
	await db.author.delete({ where: { id } });
}
