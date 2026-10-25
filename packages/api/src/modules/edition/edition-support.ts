import type { Database } from "@bbrc/db";
import {
	formatEditionLanguage,
	memberEditionKey,
	openLibraryEditionKey,
} from "@bbrc/shared";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type { EditionSummary } from "./edition.schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FORMAT_LABELS: Record<string, string> = {
	paperback: "Paperback",
	hardcover: "Hardcover",
	ebook: "E-book",
	audiobook: "Audiobook",
	other: "Other",
};

/** Open Library writes "paperback", "Hardcover", "ebook"… */
export function formatLabelOf(raw: string | null | undefined) {
	const value = raw?.trim();
	if (!value) return null;
	const known = FORMAT_LABELS[value.toLowerCase().replace(/[\s-]/g, "")];
	return known ?? value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Penguin · 2003 · Turkish": a short line that tells editions apart. */
export function editionLabelOf(parts: {
	title?: string | null;
	publisher?: string | null;
	year?: number | null;
	language?: string | null;
	fallback: string;
}) {
	const language = parts.language
		? formatEditionLanguage(parts.language)
		: null;
	const line = [
		parts.publisher,
		parts.year ? String(parts.year) : null,
		language,
	]
		.filter(Boolean)
		.join(" · ");
	return line || parts.title?.trim() || parts.fallback;
}

export type MemberEditionRow = {
	id: string;
	publicId: string;
	bookId: string;
	title: string | null;
	language: string;
	pages: number;
	isbn13: string | null;
	isbn10: string | null;
	publisher: string | null;
	publishedYear: number | null;
	format: string;
	translator: string | null;
	coverUrl: string | null;
	notes: string | null;
	status: "member" | "verified";
	createdAt: Date;
	openLibraryOlid: string | null;
	createdById: string | null;
	createdBy: { username: string; name: string; image: string | null } | null;
};

export const memberEditionSelect = {
	id: true,
	publicId: true,
	bookId: true,
	title: true,
	language: true,
	pages: true,
	isbn13: true,
	isbn10: true,
	publisher: true,
	publishedYear: true,
	format: true,
	translator: true,
	coverUrl: true,
	notes: true,
	status: true,
	createdAt: true,
	openLibraryOlid: true,
	createdById: true,
	createdBy: { select: { username: true, name: true, image: true } },
} as const;

/** The address to link to: a member edition linked to Open Library uses the Open Library one. */
export function canonicalKeyOfMember(row: {
	publicId: string;
	openLibraryOlid: string | null;
}) {
	return row.openLibraryOlid
		? openLibraryEditionKey(row.openLibraryOlid)
		: memberEditionKey(row.publicId);
}

// ── Who uses which edition ─────────────────────────────────────────────────

export type EditionUsage = {
	readers: Set<string>;
	readingNow: Set<string>;
	finishedReaders: Set<string>;
	days: number[];
	pageDays: { pages: number; days: number }[];
};

export type UsageContext = {
	members: MemberEditionRow[];
	byId: Map<string, MemberEditionRow>;
	byPublicId: Map<string, MemberEditionRow>;
	usage: Map<string, EditionUsage>;
	favouriteKey: string | null;
};

const emptyUsage = (): EditionUsage => ({
	readers: new Set(),
	readingNow: new Set(),
	finishedReaders: new Set(),
	days: [],
	pageDays: [],
});

/** Everything about the book's editions that needs counting, loaded once per request. */
export async function loadUsageContext(
	db: Database,
	bookId: string,
): Promise<UsageContext> {
	const [members, reads, readings] = await Promise.all([
		db.bookEdition.findMany({
			where: { bookId },
			select: memberEditionSelect,
		}) as Promise<MemberEditionRow[]>,
		db.read.findMany({
			where: {
				bookId,
				OR: [{ editionId: { not: null } }, { bookEditionId: { not: null } }],
				user: { ...visibleOnSiteUserWhere },
			},
			select: { userId: true, editionId: true, bookEditionId: true },
		}),
		db.reading.findMany({
			where: {
				bookId,
				OR: [{ editionOlid: { not: null } }, { bookEditionId: { not: null } }],
				user: { ...visibleOnSiteUserWhere },
			},
			select: {
				userId: true,
				editionOlid: true,
				bookEditionId: true,
				startedAt: true,
				finishedAt: true,
				totalPages: true,
			},
		}),
	]);

	const byId = new Map(members.map((row) => [row.id, row]));
	const byPublicId = new Map(members.map((row) => [row.publicId, row]));
	const keyOf = (olid: string | null, bookEditionId: string | null) => {
		if (bookEditionId) {
			const member = byId.get(bookEditionId);
			if (member) return canonicalKeyOfMember(member);
		}
		return olid ? openLibraryEditionKey(olid) : null;
	};

	const usage = new Map<string, EditionUsage>();
	const entry = (key: string) => {
		const existing = usage.get(key);
		if (existing) return existing;
		const created = emptyUsage();
		usage.set(key, created);
		return created;
	};

	for (const read of reads) {
		const key = keyOf(read.editionId, read.bookEditionId);
		if (!key) continue;
		const row = entry(key);
		row.readers.add(read.userId);
		row.finishedReaders.add(read.userId);
	}
	for (const reading of readings) {
		const key = keyOf(reading.editionOlid, reading.bookEditionId);
		if (!key) continue;
		const row = entry(key);
		row.readers.add(reading.userId);
		if (!reading.finishedAt) {
			row.readingNow.add(reading.userId);
			continue;
		}
		const days = Math.max(
			1,
			Math.ceil(
				(reading.finishedAt.getTime() - reading.startedAt.getTime()) / DAY_MS,
			),
		);
		row.days.push(days);
		if (reading.totalPages && reading.totalPages > 0) {
			row.pageDays.push({ pages: reading.totalPages, days });
		}
	}

	// The most read edition wins; a tie goes to who finished more, then to the address.
	const ranked = [...usage.entries()].sort(
		([keyA, a], [keyB, b]) =>
			b.readers.size - a.readers.size ||
			b.finishedReaders.size - a.finishedReaders.size ||
			keyA.localeCompare(keyB),
	);
	const top = ranked[0];
	const favouriteKey = top && top[1].readers.size >= 2 ? top[0] : null;
	return { members, byId, byPublicId, usage, favouriteKey };
}

export const averageDays = (row: EditionUsage | undefined) =>
	row && row.days.length > 0
		? Math.round(
				(row.days.reduce((sum, value) => sum + value, 0) / row.days.length) *
					10,
			) / 10
		: null;

export const pagesPerDay = (row: EditionUsage | undefined) => {
	if (!row || row.pageDays.length === 0) return null;
	const pages = row.pageDays.reduce((sum, value) => sum + value.pages, 0);
	const days = row.pageDays.reduce((sum, value) => sum + value.days, 0);
	return days > 0 ? Math.round((pages / days) * 10) / 10 : null;
};

export type SummarySource = {
	key: string;
	source: "open_library" | "member";
	verified: boolean;
	title?: string | null;
	publisher: string | null;
	publishedYear: number | null;
	languageCode: string | null;
	format: string | null;
	pages: number | null;
	translator: string | null;
	coverId: number | null;
	coverUrl: string | null;
};

export function summaryOf(
	source: SummarySource,
	context: UsageContext,
): EditionSummary {
	const row = context.usage.get(source.key);
	return {
		key: source.key,
		source: source.source,
		verified: source.verified,
		label: editionLabelOf({
			title: source.title,
			publisher: source.publisher,
			year: source.publishedYear,
			language: source.languageCode,
			fallback: source.key,
		}),
		language: source.languageCode
			? formatEditionLanguage(source.languageCode)
			: null,
		format: source.format,
		pages: source.pages,
		publisher: source.publisher,
		publishedYear: source.publishedYear,
		translator: source.translator,
		cover: { coverId: source.coverId, url: source.coverUrl },
		readers: row?.readers.size ?? 0,
		averageDaysToFinish: averageDays(row),
		isClubFavourite: context.favouriteKey === source.key,
	};
}

export function memberSummarySource(row: MemberEditionRow): SummarySource {
	return {
		key: canonicalKeyOfMember(row),
		source: row.openLibraryOlid ? "open_library" : "member",
		verified: row.status === "verified",
		title: row.title,
		publisher: row.publisher,
		publishedYear: row.publishedYear,
		languageCode: row.language,
		format: formatLabelOf(row.format),
		pages: row.pages,
		translator: row.translator,
		coverId: null,
		coverUrl: row.coverUrl,
	};
}

// ── "How is this one different" ────────────────────────────────────────────

export function differencesFrom(
	edition: {
		pages: number | null;
		language: string | null;
		format: string | null;
		publishedYear: number | null;
		translator: string | null;
	},
	baseline: EditionSummary,
): string[] {
	const out: string[] = [];
	if (
		edition.pages != null &&
		baseline.pages != null &&
		edition.pages !== baseline.pages
	) {
		const diff = Math.abs(edition.pages - baseline.pages);
		out.push(
			`${diff} ${diff === 1 ? "page" : "pages"} ${edition.pages < baseline.pages ? "shorter" : "longer"} than the club's most read edition`,
		);
	}
	if (
		edition.language &&
		baseline.language &&
		edition.language !== baseline.language
	) {
		out.push(
			`Different language (${edition.language} instead of ${baseline.language})`,
		);
	}
	if (edition.translator && edition.translator !== baseline.translator) {
		out.push(`Different translator (${edition.translator})`);
	}
	if (edition.format && baseline.format && edition.format !== baseline.format) {
		out.push(`${edition.format} instead of ${baseline.format.toLowerCase()}`);
	}
	if (
		edition.publishedYear != null &&
		baseline.publishedYear != null &&
		edition.publishedYear !== baseline.publishedYear
	) {
		const years = Math.abs(edition.publishedYear - baseline.publishedYear);
		out.push(
			`Published ${edition.publishedYear}, ${years} ${years === 1 ? "year" : "years"} ${edition.publishedYear < baseline.publishedYear ? "earlier" : "later"}`,
		);
	}
	return out;
}
