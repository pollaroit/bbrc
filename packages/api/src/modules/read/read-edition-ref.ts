import type { Database } from "@bbrc/db";
import { canonicalEditionKey, formatEditionLanguage } from "@bbrc/shared";
import { z } from "zod";

/** Where a read points: the edition's address and a short line to show for it. */
export const ReadEditionRefSchema = z.object({
	key: z.string(),
	label: z.string().nullable(),
});
export type ReadEditionRef = z.infer<typeof ReadEditionRefSchema>;

/** Select this next to a read's own fields to resolve its edition. */
export const readEditionRefSelect = {
	editionId: true,
	bookEdition: {
		select: {
			publicId: true,
			openLibraryOlid: true,
			title: true,
			publisher: true,
			publishedYear: true,
			language: true,
		},
	},
} as const;

type ReadEditionRow = {
	editionId: string | null;
	bookEdition: {
		publicId: string;
		openLibraryOlid: string | null;
		title: string | null;
		publisher: string | null;
		publishedYear: number | null;
		language: string;
	} | null;
};

const labelOf = (parts: (string | number | null | undefined)[]) =>
	parts
		.filter((part) => part != null && String(part).trim() !== "")
		.join(" · ") || null;

/** The labels of Open Library editions our members read, from what we saved (never a live call). */
export async function loadEditionSnapshotLabels(
	db: Database,
	olids: string[],
): Promise<Map<string, string>> {
	const unique = [...new Set(olids.map((olid) => olid.toUpperCase()))];
	if (unique.length === 0) return new Map();
	const rows = await db.editionSnapshot.findMany({
		where: { olid: { in: unique } },
		select: {
			olid: true,
			title: true,
			publisher: true,
			publishedYear: true,
			language: true,
		},
	});
	return new Map(
		rows.flatMap((row) => {
			const label = labelOf([
				row.title,
				row.publisher,
				row.publishedYear,
				row.language ? formatEditionLanguage(row.language) : null,
			]);
			return label ? [[row.olid, label] as const] : [];
		}),
	);
}

export function readEditionRef(
	row: ReadEditionRow,
	snapshotLabels: Map<string, string>,
): ReadEditionRef | null {
	if (row.bookEdition) {
		const edition = row.bookEdition;
		const key = canonicalEditionKey({
			publicId: edition.publicId,
			linkedOlid: edition.openLibraryOlid,
		});
		if (!key) return null;
		return {
			key,
			label: labelOf([
				edition.title,
				edition.publisher,
				edition.publishedYear,
				formatEditionLanguage(edition.language),
			]),
		};
	}
	if (row.editionId) {
		const key = canonicalEditionKey({ olid: row.editionId });
		if (!key) return null;
		return { key, label: snapshotLabels.get(key) ?? null };
	}
	return null;
}

/**
 * The edition each (member, book) pair read, for lists of reviews. One query for
 * all pairs plus one for the saved labels, so a page of reviews never costs one
 * lookup per review. Keys are `userId|bookId`.
 */
export async function loadReadEditionRefs(
	db: Database,
	pairs: { userId: string; bookId: string }[],
): Promise<Map<string, ReadEditionRef | null>> {
	const result = new Map<string, ReadEditionRef | null>();
	if (pairs.length === 0) return result;
	const rows = await db.read.findMany({
		where: {
			OR: pairs.map((pair) => ({ userId: pair.userId, bookId: pair.bookId })),
		},
		select: { userId: true, bookId: true, ...readEditionRefSelect },
	});
	const labels = await loadEditionSnapshotLabels(
		db,
		rows.flatMap((row) => (row.editionId ? [row.editionId] : [])),
	);
	for (const row of rows) {
		result.set(`${row.userId}|${row.bookId}`, readEditionRef(row, labels));
	}
	return result;
}
