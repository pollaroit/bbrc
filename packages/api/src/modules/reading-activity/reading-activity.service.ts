import type { Database } from "@bbrc/db";
import {
	type ActivityFilters,
	type ActivityScope,
	type ActivitySession,
	clubDayKey,
	comparePeriods,
	dailyActivity,
	dayOf,
	daysInclusive,
	facets,
	filterSessions,
	finishedBook,
	hasSessionOnlyFilters,
	limitedNumbers,
	limitFilters,
	PROGRESS_SORT_FIELDS,
	pagesGained,
	percentGained,
	personalBests,
	presetRange,
	rankings,
	resolveClubTimeZone,
	sessionStreaks,
	sortSessions,
	speedByMonth,
	speedOf,
	summarize,
	targetMet,
	timeByMode,
	usualSpeed,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	assertMemberAvailable,
	memberAccessSelect,
} from "../user/member-access";
import type {
	ActivityFiltersInput,
	ActivityOverviewInput,
	ActivityOverviewOutput,
	ActivitySessionItem,
	ActivitySessionsInput,
	ActivitySessionsOutput,
} from "./reading-activity.schema";
import {
	type ActivityAccess,
	decideActivityAccess,
} from "./reading-activity-access";

/** More than this is far beyond any real member; it only guards the server. */
const MAX_SESSIONS = 5000;
/** Days, weeks and months are ranked top 10; the screen shows 5 and "Show all". */
const RANK_LIMIT = 10;
const BOOK_RANK_LIMIT = 50;
const CALENDAR_DAYS = 365;

type Loaded = {
	owner: { id: string; username: string };
	access: Exclude<ActivityAccess, { kind: "unavailable" }>;
};

/** Who the member is and what this viewer may see of them (not found when blocked). */
async function loadAccess(
	db: Database,
	viewer: Viewer,
	username: string,
): Promise<Loaded> {
	const owner = await db.user.findUnique({
		where: { username },
		select: {
			...memberAccessSelect,
			username: true,
			showReadingProgress: true,
		},
	});
	assertMemberAvailable(owner, viewer, username);
	const access = decideActivityAccess(viewer, owner);
	if (access.kind === "unavailable") {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	return { owner: { id: owner.id, username: owner.username }, access };
}

/** Finished sessions of a book, newest first. Sessions without a book are never read. */
async function loadSessions(
	db: Database,
	userId: string,
): Promise<ActivitySession[]> {
	const rows = await db.readingSession.findMany({
		where: {
			userId,
			endedAt: { not: null },
			readingId: { not: null },
			activeSeconds: { gt: 0 },
		},
		orderBy: { endedAt: "desc" },
		take: MAX_SESSIONS,
		select: {
			id: true,
			startedAt: true,
			endedAt: true,
			activeSeconds: true,
			mode: true,
			targetMinutes: true,
			pageFrom: true,
			pageTo: true,
			percentFrom: true,
			percentTo: true,
			reading: {
				select: {
					editionFormat: true,
					book: {
						select: {
							id: true,
							slug: true,
							title: true,
							coverId: true,
							authorLinks: {
								orderBy: { position: "asc" },
								select: { author: { select: { slug: true, name: true } } },
							},
						},
					},
				},
			},
		},
	});
	return rows.flatMap((row) => {
		if (!row.endedAt || !row.reading) return [];
		const { book } = row.reading;
		return [
			{
				id: row.id,
				startedAt: row.startedAt,
				endedAt: row.endedAt,
				seconds: row.activeSeconds,
				mode: row.mode,
				targetMinutes: row.targetMinutes,
				pageFrom: row.pageFrom,
				pageTo: row.pageTo,
				percentFrom: row.percentFrom,
				percentTo: row.percentTo,
				format: row.reading.editionFormat,
				book: {
					id: book.id,
					slug: book.slug,
					title: book.title,
					coverId: book.coverId,
					authors: book.authorLinks.map((link) => link.author),
				},
			},
		];
	});
}

function toFilters(
	input: ActivityFiltersInput,
	today: string,
): ActivityFilters {
	const preset =
		input.range && !input.from && !input.to
			? presetRange(input.range, today)
			: null;
	const {
		from: rawFrom,
		to: rawTo,
		books,
		authors,
		modes,
		formats,
		minMinutes,
		maxMinutes,
		minPages,
		maxPages,
		minPercent,
		maxPercent,
		minSpeed,
		maxSpeed,
		finished,
		targetMet: met,
		dayParts,
		weekdays,
	} = input;
	const from = preset?.from ?? rawFrom;
	const to = preset?.to ?? rawTo;
	return {
		from,
		to,
		books,
		authors,
		modes,
		formats,
		minMinutes,
		maxMinutes,
		minPages,
		maxPages,
		minPercent,
		maxPercent,
		minSpeed,
		maxSpeed,
		finished,
		targetMet: met,
		dayParts,
		weekdays,
	};
}

function ranked<T extends { pages: number | null }>(
	rows: T[],
	limit: number,
	progress: boolean,
) {
	return rows.slice(0, limit).map((row) => ({
		...row,
		pages: progress ? row.pages : null,
	}));
}

/** The page: totals, bests, comparison, calendar, methods, speed, rankings and the filter facets. */
export async function getActivityOverview(
	db: Database,
	viewer: Viewer,
	input: ActivityOverviewInput,
): Promise<ActivityOverviewOutput> {
	const tz = resolveClubTimeZone();
	const today = clubDayKey(new Date(), tz);
	const { owner, access } = await loadAccess(db, viewer, input.username);
	if (access.kind === "closed") return { access: "closed" };

	const all = await loadSessions(db, owner.id);
	if (access.kind === "numbers") {
		return {
			access: "numbers",
			numbers: limitedNumbers(all, today, tz),
		};
	}

	const { scope, isOwner } = access;
	const filters = limitFilters(toFilters(input, today), scope);
	// The comparison needs everything but the date, so it can look at the range before.
	const undated = filterSessions(all, filters, tz, { ignoreDates: true });
	const sessions = filterSessions(undated, filters, tz);
	const summary = summarize(sessions, tz);
	const bests = personalBests(sessions, today, tz);
	const rank = rankings(sessions, scope, tz);

	const range =
		filters.from || filters.to
			? {
					from: filters.from ?? "0000-01-01",
					to: filters.to ?? today,
				}
			: presetRange("all", today);
	const comparison =
		range && filters.from ? comparePeriods(undated, range, tz) : null;

	const calendarFrom = new Date(
		Date.now() - CALENDAR_DAYS * 24 * 60 * 60 * 1000,
	);
	const calendarStart = clubDayKey(calendarFrom, tz);

	const allFacets = facets(all);
	const finishedBlock = scope.finish
		? await loadFinishedBlock(db, owner.id, filters, tz)
		: null;

	return {
		access: "full",
		isOwner,
		scope,
		today,
		summary: {
			...summary,
			pagesGained: scope.progress ? summary.pagesGained : null,
		},
		streak: sessionStreaks(sessions, today, tz),
		bests: scope.progress
			? bests
			: {
					...bests,
					mostPagesSession: null,
					mostPagesDay: null,
					fastestSpeed: null,
				},
		comparison,
		// Every filter but the date, so picking a day never empties the calendar.
		calendar: dailyActivity(undated, tz)
			.filter((entry) => entry.day >= calendarStart)
			.map((entry) => ({
				...entry,
				pages: scope.progress ? entry.pages : null,
				books: entry.books.slice(0, 4),
			})),
		rangeDays: daysInclusive(
			filters.from ?? allFacets.firstDay ?? today,
			filters.to ?? today,
		),
		modes: timeByMode(sessions),
		speedByMonth: scope.progress ? speedByMonth(sessions, tz) : [],
		usualSpeed: scope.progress ? usualSpeed(sessions) : null,
		rankings: {
			books: ranked(rank.books, BOOK_RANK_LIMIT, scope.progress),
			days: ranked(rank.days, RANK_LIMIT, scope.progress),
			weeks: ranked(rank.weeks, RANK_LIMIT, scope.progress),
			months: ranked(rank.months, RANK_LIMIT, scope.progress),
			weekdays: ranked(rank.weekdays, 7, scope.progress),
			dayParts: rank.dayParts ? ranked(rank.dayParts, 4, scope.progress) : null,
		},
		facets: scope.progress
			? allFacets
			: { ...allFacets, maxPages: 0, maxSpeed: 0 },
		finishedBlock,
	};
}

/**
 * Books finished come from readings, not sessions, so only the book and date
 * filters can apply to them. With any other filter on, the block says so and
 * shows nothing rather than numbers that look filtered but are not.
 */
async function loadFinishedBlock(
	db: Database,
	userId: string,
	filters: ActivityFilters,
	tz: string,
) {
	const hidden = hasSessionOnlyFilters(filters);
	if (hidden) {
		return {
			hidden,
			count: 0,
			averageDays: null,
			pagesPerDay: null,
			perMonth: [],
			items: [],
		};
	}
	const rows = await db.reading.findMany({
		where: { userId, finishedAt: { not: null } },
		orderBy: { finishedAt: "desc" },
		select: {
			startedAt: true,
			finishedAt: true,
			totalPages: true,
			book: {
				select: { slug: true, title: true, authors: true, coverId: true },
			},
		},
	});
	const items = rows.flatMap((row) => {
		if (!row.finishedAt) return [];
		const day = clubDayKey(row.finishedAt, tz);
		if (filters.from && day < filters.from) return [];
		if (filters.to && day > filters.to) return [];
		if (filters.books?.length && !filters.books.includes(row.book.slug)) {
			return [];
		}
		return [
			{
				slug: row.book.slug,
				title: row.book.title,
				authors: row.book.authors,
				coverId: row.book.coverId,
				finishedAt: row.finishedAt,
				days: Math.max(
					1,
					Math.ceil(
						(row.finishedAt.getTime() - row.startedAt.getTime()) /
							(24 * 60 * 60 * 1000),
					),
				),
				totalPages: row.totalPages,
			},
		];
	});
	const perMonth = new Map<string, number>();
	for (const item of items) {
		const month = clubDayKey(item.finishedAt, tz).slice(0, 7);
		perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
	}
	const withPages = items.filter((item) => item.totalPages != null);
	const pageDays = withPages.reduce((sum, item) => sum + item.days, 0);
	return {
		hidden,
		count: items.length,
		averageDays: items.length
			? items.reduce((sum, item) => sum + item.days, 0) / items.length
			: null,
		pagesPerDay: pageDays
			? withPages.reduce((sum, item) => sum + (item.totalPages ?? 0), 0) /
				pageDays
			: null,
		perMonth: [...perMonth.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, count]) => ({ month, count })),
		items: items.slice(0, 24),
	};
}

function toItem(
	s: ActivitySession,
	scope: ActivityScope,
	tz: string,
	all: readonly ActivitySession[],
): ActivitySessionItem {
	const day = dayOf(s, tz);
	return {
		id: s.id,
		day,
		bookSlug: s.book.slug,
		title: s.book.title,
		coverId: s.book.coverId,
		authors: s.book.authors.map((a) => a.name),
		seconds: s.seconds,
		mode: s.mode,
		targetMinutes: s.mode === "countdown" ? s.targetMinutes : null,
		targetMet: targetMet(s),
		format: s.format,
		pages: scope.progress ? pagesGained(s) : null,
		percent: scope.progress ? percentGained(s) : null,
		percentFrom: scope.progress ? s.percentFrom : null,
		percentTo: scope.progress ? s.percentTo : null,
		pageFrom: scope.progress ? s.pageFrom : null,
		pageTo: scope.progress ? s.pageTo : null,
		speed: scope.progress ? speedOf(s) : null,
		finished: scope.finish ? finishedBook(s) : null,
		detail: scope.clock
			? {
					startedAt: s.startedAt,
					endedAt: s.endedAt,
					pageFrom: s.pageFrom,
					pageTo: s.pageTo,
					percentFrom: s.percentFrom,
					percentTo: s.percentTo,
					sameDay: all
						.filter((other) => other.id !== s.id && dayOf(other, tz) === day)
						.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
						.map((other) => ({
							id: other.id,
							startedAt: other.startedAt,
							seconds: other.seconds,
							title: other.book.title,
						})),
				}
			: null,
	};
}

/** One page of the grid, for the filters and sort in force. */
export async function getActivitySessions(
	db: Database,
	viewer: Viewer,
	input: ActivitySessionsInput,
): Promise<ActivitySessionsOutput> {
	const tz = resolveClubTimeZone();
	const today = clubDayKey(new Date(), tz);
	const { owner, access } = await loadAccess(db, viewer, input.username);
	if (access.kind !== "full") {
		throw new ORPCError("FORBIDDEN", {
			message: "This member keeps their reading sessions private.",
		});
	}
	const { scope, isOwner } = access;

	const all = await loadSessions(db, owner.id);
	const filtered = filterSessions(
		all,
		limitFilters(toFilters(input, today), scope),
		tz,
	);
	// A sort on progress is not available to someone who cannot see progress.
	const sortBy =
		!scope.progress && PROGRESS_SORT_FIELDS.includes(input.sortBy)
			? "date"
			: input.sortBy;
	const sorted = sortSessions(filtered, sortBy, input.sortDirection);
	const page = sorted.slice(input.offset, input.offset + input.limit);
	const summary = summarize(filtered, tz);

	return {
		items: page.map((s) => toItem(s, scope, tz, scope.clock ? all : [])),
		total: sorted.length,
		nextOffset:
			input.offset + page.length < sorted.length
				? input.offset + page.length
				: null,
		summary: {
			...summary,
			pagesGained: scope.progress ? summary.pagesGained : null,
		},
		scope,
		isOwner,
		usualSpeed: scope.progress && isOwner ? usualSpeed(all) : null,
	};
}
