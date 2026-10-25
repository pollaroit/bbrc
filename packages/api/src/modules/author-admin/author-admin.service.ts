import type { Database, Prisma } from "@bbrc/db";
import {
	AUTHOR_FIELDS,
	type AuthorField,
	type AuthorFieldMeta,
	authorNameKey,
	authorNameSimilarity,
	formatAuthorLifespan,
	LIKELY_SAME_AUTHOR_SCORE,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { enrichAuthor } from "../../lib/author-enrichment/enrich";
import type { EnrichableField } from "../../lib/author-enrichment/fields";
import {
	assertOwnPhotoUrl,
	storeSuggestedPhoto,
	suggestAuthorPhoto,
} from "../../lib/author-enrichment/photo";
import { scheduleAuthorEnrichment } from "../../lib/author-enrichment/schedule";
import {
	type AuthorSources,
	defaultAuthorSources,
} from "../../lib/author-enrichment/sources";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import {
	type AuthorCandidate,
	type AuthorSummary,
	authorSummarySelect,
	createAuthor,
	deleteAuthorRecord,
	mergeAuthors,
	normalizeAuthorName,
	syncBookAuthorNames,
	toAuthorSummary,
} from "./author-core";
import { findMergeSuggestions } from "./merge-suggestions";

type AuthorGenderValue = "female" | "male" | "non_binary" | "other" | "unknown";
type AuthorStatusValue = "verified" | "auto" | "needs_review";
type AuthorEnrichmentStatusValue = "pending" | "running" | "done" | "failed";

type DateInput = { year: number; month?: number | null; day?: number | null };

function datePatch(prefix: "birth" | "death", value: DateInput | null) {
	const year = value?.year ?? null;
	const month = value?.month ?? null;
	const day = value?.day ?? null;
	return prefix === "birth"
		? { birthYear: year, birthMonth: month, birthDay: day }
		: { deathYear: year, deathMonth: month, deathDay: day };
}

function sameDate(
	value: DateInput | null,
	year: number | null,
	month: number | null,
	day: number | null,
): boolean {
	if (value == null) return year == null;
	return (
		value.year === year &&
		(value.month ?? null) === month &&
		(value.day ?? null) === day
	);
}

const authorNotFound = () =>
	new ORPCError("NOT_FOUND", { message: "Author not found." });

// ── Chip search (add / edit book) ──────────────────────────────────────────

export type AuthorChipResult = AuthorSummary & { lifespan: string | null };

export type OpenLibraryAuthorChipResult = {
	olid: string;
	name: string;
	topWork: string | null;
	birthYear: number | null;
	/** An author we already have that this looks like ("Looks like X, already in the library"). */
	looksLike: { id: string; slug: string; name: string } | null;
};

export async function searchAuthorsForChips(
	query: string,
	db: Database,
	sources: AuthorSources = defaultAuthorSources,
) {
	const key = authorNameKey(query);

	const where: Prisma.AuthorWhereInput | undefined =
		query.length === 0
			? undefined
			: {
					OR: [
						{ name: { contains: query, mode: "insensitive" } },
						...(key
							? [
									{ nameKey: { contains: key } },
									{ aliases: { some: { key: { contains: key } } } },
								]
							: []),
					],
				};

	const rows = await db.author.findMany({
		where,
		orderBy: [{ books: { _count: "desc" } }, { name: "asc" }],
		take: 8,
		select: {
			...authorSummarySelect,
			birthMonth: true,
			birthDay: true,
			deathMonth: true,
			deathDay: true,
		},
	});

	const authors: AuthorChipResult[] = rows.map((row) => {
		const { birthMonth, birthDay, deathMonth, deathDay, ...summaryRow } = row;
		return {
			...toAuthorSummary(summaryRow),
			lifespan: formatAuthorLifespan({
				birth: { year: row.birthYear, month: birthMonth, day: birthDay },
				death: { year: row.deathYear, month: deathMonth, day: deathDay },
			}),
		};
	});

	let openLibrary: OpenLibraryAuthorChipResult[] = [];
	if (query.length >= 2) {
		try {
			const hits = await sources.openLibrarySearchAuthors(query, 10);
			const known = await db.author.findMany({
				where: { openLibraryId: { in: hits.map((hit) => hit.olid) } },
				select: { openLibraryId: true },
			});
			const knownIds = new Set(known.map((row) => row.openLibraryId));
			const fresh = hits.filter((hit) => !knownIds.has(hit.olid)).slice(0, 5);

			const [everyone, aliases] = await Promise.all([
				db.author.findMany({ select: { id: true, slug: true, name: true } }),
				db.authorAlias.findMany({
					select: {
						alias: true,
						author: { select: { id: true, slug: true, name: true } },
					},
				}),
			]);
			openLibrary = fresh.map((hit) => {
				let looksLike: { id: string; slug: string; name: string } | null = null;
				let best = 0;
				const consider = (
					label: string,
					author: { id: string; slug: string; name: string },
				) => {
					const score = authorNameSimilarity(label, hit.name);
					if (score >= LIKELY_SAME_AUTHOR_SCORE && score > best) {
						best = score;
						looksLike = author;
					}
				};
				for (const author of everyone) consider(author.name, author);
				for (const row of aliases) consider(row.alias, row.author);
				return {
					olid: hit.olid,
					name: hit.name,
					topWork: hit.topWork,
					birthYear: hit.birthYear,
					looksLike,
				};
			});
		} catch {
			openLibrary = [];
		}
	}

	return { authors, openLibrary };
}

// ── Create ─────────────────────────────────────────────────────────────────

export type CandidateOutput = {
	author: AuthorSummary;
	reason: AuthorCandidate["reason"];
	score: number;
	matchedName: string | null;
};

export async function createAuthorByAdmin(
	input: { name: string; openLibraryId?: string; force?: boolean },
	db: Database,
	adminUserId: string,
) {
	const result = await createAuthor(db, {
		name: input.name,
		openLibraryId: input.openLibraryId ?? null,
		createdById: adminUserId,
		force: input.force,
	});
	if (result.created) {
		scheduleAuthorEnrichment(db, [result.author.id]);
	}
	return result;
}

// ── Detail for the edit screen ─────────────────────────────────────────────

export async function getAuthorForEdit(slug: string, db: Database) {
	const direct = await db.author.findUnique({
		where: { slug },
		select: { id: true },
	});
	const id =
		direct?.id ??
		(
			await db.authorSlugRedirect.findUnique({
				where: { slug },
				select: { authorId: true },
			})
		)?.authorId;
	if (!id) throw authorNotFound();

	const author = await db.author.findUniqueOrThrow({
		where: { id },
		include: {
			aliases: { orderBy: { alias: "asc" } },
			createdBy: { select: { username: true, name: true } },
			_count: { select: { books: true, followers: true } },
		},
	});
	const { fieldMeta, _count, gender, status, enrichmentStatus, ...rest } =
		author;
	return {
		...rest,
		// Plain unions (not Prisma's enum types) keep the router's declaration portable.
		gender: gender as AuthorGenderValue,
		status: status as AuthorStatusValue,
		enrichmentStatus: enrichmentStatus as AuthorEnrichmentStatusValue,
		fieldMeta: (fieldMeta ?? {}) as AuthorFieldMeta,
		bookCount: _count.books,
		followerCount: _count.followers,
	};
}

// ── Update, locks, aliases ─────────────────────────────────────────────────

export type UpdateAuthorFields = {
	id: string;
	name?: string;
	sortName?: string | null;
	bio?: string | null;
	birth?: DateInput | null;
	death?: DateInput | null;
	birthPlace?: string | null;
	deathPlace?: string | null;
	nationalities?: string[];
	gender?: "female" | "male" | "non_binary" | "other" | "unknown";
	wikipediaUrl?: string | null;
	goodreadsUrl?: string | null;
	websiteUrl?: string | null;
	openLibraryId?: string | null;
	wikidataId?: string | null;
};

export async function updateAuthor(input: UpdateAuthorFields, db: Database) {
	const { id } = input;

	return db.$transaction(async (tx) => {
		const author = await tx.author.findUnique({ where: { id } });
		if (!author) throw authorNotFound();

		const meta: AuthorFieldMeta = {
			...((author.fieldMeta ?? {}) as AuthorFieldMeta),
		};
		const data: Prisma.AuthorUpdateInput = {};
		const touch = (field: AuthorField) => {
			meta[field] = {
				source: "admin",
				...(meta[field]?.locked ? { locked: true } : {}),
			};
		};
		let renamedBooks = false;

		if (input.name !== undefined) {
			const name = normalizeAuthorName(input.name);
			if (name !== author.name) {
				const key = authorNameKey(name);
				const [clash, aliasClash] = await Promise.all([
					tx.author.findFirst({
						where: { nameKey: key, id: { not: id } },
						select: { name: true },
					}),
					tx.authorAlias.findUnique({
						where: { key },
						select: { alias: true, authorId: true },
					}),
				]);
				if (clash || (aliasClash && aliasClash.authorId !== id)) {
					throw new ORPCError("CONFLICT", {
						message: `Another author already has the name “${clash?.name ?? aliasClash?.alias}”. Merge them instead.`,
					});
				}
				data.name = name;
				data.nameKey = key;
				touch("name");
				// Their old spelling keeps pointing here.
				const oldKey = author.nameKey;
				if (oldKey !== key) {
					const taken = await tx.authorAlias.findUnique({
						where: { key: oldKey },
					});
					if (!taken) {
						await tx.authorAlias.create({
							data: { authorId: id, alias: author.name, key: oldKey },
						});
					}
				}
				// If the new name was one of their aliases, it is the primary name now.
				if (aliasClash?.authorId === id) {
					await tx.authorAlias.delete({ where: { key } });
				}
				renamedBooks = true;
			}
		}

		if (input.sortName !== undefined && input.sortName !== author.sortName) {
			data.sortName = input.sortName;
			touch("sortName");
		}
		if (input.bio !== undefined && (input.bio ?? null) !== author.bio) {
			data.bio = input.bio;
			data.bioSource = input.bio ? "admin" : null;
			touch("bio");
		}
		if (
			input.birth !== undefined &&
			!sameDate(
				input.birth,
				author.birthYear,
				author.birthMonth,
				author.birthDay,
			)
		) {
			Object.assign(data, datePatch("birth", input.birth));
			touch("birth");
		}
		if (
			input.death !== undefined &&
			!sameDate(
				input.death,
				author.deathYear,
				author.deathMonth,
				author.deathDay,
			)
		) {
			Object.assign(data, datePatch("death", input.death));
			touch("death");
		}
		for (const field of [
			"birthPlace",
			"deathPlace",
			"wikipediaUrl",
			"goodreadsUrl",
			"websiteUrl",
		] as const) {
			const value = input[field];
			if (value !== undefined && (value ?? null) !== author[field]) {
				data[field] = value;
				touch(field);
			}
		}
		if (
			input.nationalities !== undefined &&
			input.nationalities.join(",") !== author.nationalities.join(",")
		) {
			data.nationalities = input.nationalities;
			touch("nationalities");
		}
		if (input.gender !== undefined && input.gender !== author.gender) {
			data.gender = input.gender;
			touch("gender");
		}
		if (
			input.openLibraryId !== undefined &&
			input.openLibraryId !== author.openLibraryId
		) {
			if (input.openLibraryId) {
				const holder = await tx.author.findUnique({
					where: { openLibraryId: input.openLibraryId },
					select: { id: true, name: true },
				});
				if (holder && holder.id !== id) {
					throw new ORPCError("CONFLICT", {
						message: `“${holder.name}” already has that Open Library record. Merge them instead.`,
					});
				}
			}
			data.openLibraryId = input.openLibraryId;
		}
		if (
			input.wikidataId !== undefined &&
			input.wikidataId !== author.wikidataId
		) {
			data.wikidataId = input.wikidataId;
		}

		if (Object.keys(data).length === 0) {
			return { id, slug: author.slug, changed: false };
		}

		await tx.author.update({
			where: { id },
			data: { ...data, fieldMeta: meta as Prisma.InputJsonValue },
		});

		if (renamedBooks) {
			const links = await tx.bookAuthor.findMany({
				where: { authorId: id },
				select: { bookId: true },
			});
			await syncBookAuthorNames(
				tx,
				links.map((link) => link.bookId),
			);
		}
		return { id, slug: author.slug, changed: true };
	});
}

export async function setAuthorFieldLock(
	input: { id: string; field: AuthorField; locked: boolean },
	db: Database,
) {
	const author = await db.author.findUnique({
		where: { id: input.id },
		select: { fieldMeta: true },
	});
	if (!author) throw authorNotFound();
	const meta = { ...((author.fieldMeta ?? {}) as AuthorFieldMeta) };
	const current = meta[input.field];
	if (input.locked) {
		meta[input.field] = { source: current?.source ?? "admin", locked: true };
	} else if (current) {
		meta[input.field] = { source: current.source };
	}
	await db.author.update({
		where: { id: input.id },
		data: { fieldMeta: meta as Prisma.InputJsonValue },
	});
	return { id: input.id, field: input.field, locked: input.locked };
}

export async function addAuthorAlias(
	input: { id: string; alias: string },
	db: Database,
) {
	const alias = normalizeAuthorName(input.alias);
	const key = authorNameKey(alias);
	if (!key) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That alias has no letters.",
		});
	}
	const author = await db.author.findUnique({
		where: { id: input.id },
		select: { nameKey: true },
	});
	if (!author) throw authorNotFound();
	if (key === author.nameKey) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That is already this author’s name.",
		});
	}
	const [aliasOwner, nameOwner] = await Promise.all([
		db.authorAlias.findUnique({
			where: { key },
			select: { authorId: true, author: { select: { name: true } } },
		}),
		db.author.findFirst({ where: { nameKey: key }, select: { name: true } }),
	]);
	if (aliasOwner && aliasOwner.authorId === input.id) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That alias already exists.",
		});
	}
	const owner = aliasOwner?.author.name ?? nameOwner?.name;
	if (owner) {
		throw new ORPCError("CONFLICT", {
			message: `“${owner}” already goes by that name. Merge the two authors instead.`,
		});
	}
	const created = await db.authorAlias.create({
		data: { authorId: input.id, alias, key },
		select: { id: true, alias: true },
	});
	return created;
}

export async function removeAuthorAlias(
	input: { id: string; aliasId: string },
	db: Database,
) {
	const result = await db.authorAlias.deleteMany({
		where: { id: input.aliasId, authorId: input.id },
	});
	return { removed: result.count > 0 };
}

export async function confirmAuthor(id: string, db: Database) {
	const result = await db.author.updateMany({
		where: { id },
		data: { status: "verified" },
	});
	if (result.count === 0) throw authorNotFound();
	return { id, status: "verified" as const };
}

export async function refreshAuthor(
	input: { id: string; fields?: EnrichableField[] },
	db: Database,
) {
	const exists = await db.author.findUnique({
		where: { id: input.id },
		select: { id: true },
	});
	if (!exists) throw authorNotFound();
	// A hand-run refresh may always try again.
	await db.author.update({
		where: { id: input.id },
		data: { enrichmentAttempts: 0, enrichmentError: null },
	});
	const result = await enrichAuthor(db, input.id, {
		mode: "refresh",
		only: input.fields,
	});
	if (result.skipped) {
		throw new ORPCError("CONFLICT", {
			message:
				"This author is being refreshed right now. Try again in a moment.",
		});
	}
	return { changed: result.changed, stillEmpty: result.stillEmpty };
}

// ── Merge / delete ─────────────────────────────────────────────────────────

export async function mergeAuthorsByAdmin(
	input: { fromId: string; intoId: string },
	db: Database,
) {
	const result = await mergeAuthors(db, input.fromId, input.intoId);
	return {
		into: result.into,
		movedBooks: result.movedBooks,
		movedFollowers: result.movedFollowers,
		bookSlugs: result.bookSlugs,
	};
}

export async function deleteAuthorByAdmin(id: string, db: Database) {
	const author = await db.author.findUnique({
		where: { id },
		select: { photoUrl: true },
	});
	await deleteAuthorRecord(db, id);
	void tryDeleteR2PublicUrl(author?.photoUrl);
	return { id };
}

// ── Photos ─────────────────────────────────────────────────────────────────

export async function suggestPhoto(
	id: string,
	db: Database,
	sources: AuthorSources = defaultAuthorSources,
) {
	const suggestion = await suggestAuthorPhoto(db, id, sources);
	return { suggestion };
}

async function savePhoto(
	db: Database,
	id: string,
	photo: {
		url: string;
		credit: string | null;
		license: string | null;
		sourceUrl: string | null;
	},
) {
	const author = await db.author.findUnique({
		where: { id },
		select: { photoUrl: true, fieldMeta: true },
	});
	if (!author) throw authorNotFound();
	const meta = { ...((author.fieldMeta ?? {}) as AuthorFieldMeta) };
	meta.photo = {
		source: "admin",
		...(meta.photo?.locked ? { locked: true } : {}),
	};
	await db.author.update({
		where: { id },
		data: {
			photoUrl: photo.url,
			photoCredit: photo.credit,
			photoLicense: photo.license,
			photoSourceUrl: photo.sourceUrl,
			fieldMeta: meta as Prisma.InputJsonValue,
		},
	});
	if (author.photoUrl && author.photoUrl !== photo.url) {
		void tryDeleteR2PublicUrl(author.photoUrl);
	}
	return { photoUrl: photo.url };
}

/** Copies the Commons photo the admin chose into our storage, with its credit and licence. */
export async function applySuggestedPhoto(
	id: string,
	db: Database,
	sources: AuthorSources = defaultAuthorSources,
) {
	const suggestion = await suggestAuthorPhoto(db, id, sources);
	if (!suggestion) {
		throw new ORPCError("NOT_FOUND", {
			message: "No free photo was found for this author.",
		});
	}
	const url = await storeSuggestedPhoto(suggestion);
	return savePhoto(db, id, {
		url,
		credit: suggestion.credit,
		license: suggestion.license,
		sourceUrl: suggestion.sourceUrl,
	});
}

/** Saves a photo the admin uploaded (the file is already in our storage). */
export async function saveUploadedPhoto(
	input: {
		id: string;
		photoUrl: string;
		credit?: string | null;
		license?: string | null;
		sourceUrl?: string | null;
	},
	db: Database,
) {
	assertOwnPhotoUrl(input.photoUrl);
	return savePhoto(db, input.id, {
		url: input.photoUrl,
		credit: input.credit ?? null,
		license: input.license ?? null,
		sourceUrl: input.sourceUrl ?? null,
	});
}

export async function removeAuthorPhoto(id: string, db: Database) {
	const author = await db.author.findUnique({
		where: { id },
		select: { photoUrl: true, fieldMeta: true },
	});
	if (!author) throw authorNotFound();
	const meta = { ...((author.fieldMeta ?? {}) as AuthorFieldMeta) };
	delete meta.photo;
	await db.author.update({
		where: { id },
		data: {
			photoUrl: null,
			photoCredit: null,
			photoLicense: null,
			photoSourceUrl: null,
			fieldMeta: meta as Prisma.InputJsonValue,
		},
	});
	void tryDeleteR2PublicUrl(author.photoUrl);
	return { id };
}

// ── Review queue ───────────────────────────────────────────────────────────

const reviewSelect = {
	...authorSummarySelect,
	bio: true,
	enrichmentStatus: true,
	enrichmentError: true,
	createdAt: true,
	fieldMeta: true,
} satisfies Prisma.AuthorSelect;

export async function getReviewQueue(limit: number, db: Database) {
	const [needsReviewRows, autoRows, everyone, aliasRows] = await Promise.all([
		db.author.findMany({
			where: { status: "needs_review" },
			orderBy: { createdAt: "desc" },
			take: limit,
			select: reviewSelect,
		}),
		db.author.findMany({
			where: { status: "auto" },
			orderBy: { createdAt: "desc" },
			take: limit,
			select: reviewSelect,
		}),
		db.author.findMany({
			select: {
				id: true,
				name: true,
				status: true,
				wikidataId: true,
				openLibraryId: true,
			},
		}),
		db.authorAlias.findMany({ select: { authorId: true, alias: true } }),
	]);

	const aliasesByAuthor = new Map<string, string[]>();
	for (const row of aliasRows) {
		const list = aliasesByAuthor.get(row.authorId) ?? [];
		list.push(row.alias);
		aliasesByAuthor.set(row.authorId, list);
	}

	const suggestions = findMergeSuggestions(
		everyone.map((author) => ({
			id: author.id,
			name: author.name,
			wikidataId: author.wikidataId,
			openLibraryId: author.openLibraryId,
			verified: author.status === "verified",
			aliases: aliasesByAuthor.get(author.id),
		})),
	).slice(0, limit);

	const wanted = new Set(suggestions.flatMap((s) => [s.aId, s.bId]));
	const summaries = new Map(
		(
			await db.author.findMany({
				where: { id: { in: [...wanted] } },
				select: authorSummarySelect,
			})
		).map((row) => [row.id, toAuthorSummary(row)]),
	);

	const mapReview = (row: (typeof needsReviewRows)[number]) => {
		const { bio, fieldMeta, _count, ...rest } = row;
		const meta = (fieldMeta ?? {}) as AuthorFieldMeta;
		return {
			...toAuthorSummary({ ...rest, _count }),
			enrichmentStatus: row.enrichmentStatus as AuthorEnrichmentStatusValue,
			enrichmentError: row.enrichmentError,
			createdAt: row.createdAt,
			hasBio: Boolean(bio?.trim()),
			/** Which fields a machine filled (so the admin knows what to check). */
			autoFields: AUTHOR_FIELDS.filter((field) => {
				const entry = meta[field];
				return entry != null && entry.source !== "admin";
			}),
		};
	};

	return {
		needsReview: needsReviewRows.map(mapReview),
		autoFilled: autoRows.map(mapReview),
		mergeSuggestions: suggestions.flatMap((suggestion) => {
			const a = summaries.get(suggestion.aId);
			const b = summaries.get(suggestion.bId);
			return a && b
				? [{ a, b, reason: suggestion.reason, score: suggestion.score }]
				: [];
		}),
	};
}
