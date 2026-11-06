import type { UserStatsPeriodBounds } from "./period";
import { enumerateMonthsInBounds, monthSortKey } from "./period";

/*
 * The club's sittings in numbers: how many, how many people, how it ended, how voting
 * went, how long the chosen books are. Pure functions over plain rows, so the page and
 * its tests need no database.
 */

export type SittingStatusName = "voting" | "reading" | "finished";
export type ProgressName = "not_started" | "in_progress" | "completed" | "dnf";

export type ClubSittingRow = {
	id: string;
	slug: string;
	status: SittingStatusName;
	createdAt: Date;
	joinType: "public" | "unlisted" | "private";
	/** Pages of the chosen book, when one has been chosen. */
	bookPages: number | null;
	bookTitle: string | null;
	bookSlug: string | null;
	bookCoverId: number | null;
};

export type ClubParticipationRow = {
	sittingId: string;
	userId: string;
	progress: ProgressName;
	joinSource: string;
	joinedAt: Date;
};

export type ClubVoteRow = { sittingId: string; userId: string };

const round1 = (value: number) => Math.round(value * 10) / 10;
const pct = (part: number, whole: number): number | null =>
	whole > 0 ? Math.round((part / whole) * 100) : null;

export type ClubSittingSummary = {
	total: number;
	finished: number;
	reading: number;
	voting: number;
	participations: number;
	/** Different members who took part in at least one. */
	participants: number;
	/** People per sitting, over sittings that had anyone. */
	averageParticipants: number;
	completed: number;
	didNotFinish: number;
	inProgress: number;
	notStarted: number;
	/** Of the participations that are over (finished or not), how many finished. */
	completionRate: number | null;
	dnfRate: number | null;
	votes: number;
	/** Different members who voted in at least one poll. */
	voters: number;
	/** On average, how many of a sitting's participants voted in it (0 to 100). */
	turnout: number | null;
	averageVotesPerSitting: number;
	/** Pages of the chosen books, over sittings with a chosen book. */
	averageBookPages: number | null;
	longestBook: { title: string; pages: number } | null;
	shortestBook: { title: string; pages: number } | null;
};

export function summarizeSittings(
	sittings: readonly ClubSittingRow[],
	participations: readonly ClubParticipationRow[],
	votes: readonly ClubVoteRow[],
): ClubSittingSummary {
	const count = (progress: ProgressName) =>
		participations.filter((row) => row.progress === progress).length;
	const completed = count("completed");
	const didNotFinish = count("dnf");
	const over = completed + didNotFinish;

	const people = new Map<string, Set<string>>();
	for (const row of participations) {
		const set = people.get(row.sittingId) ?? new Set<string>();
		set.add(row.userId);
		people.set(row.sittingId, set);
	}
	const voted = new Map<string, Set<string>>();
	for (const row of votes) {
		const set = voted.get(row.sittingId) ?? new Set<string>();
		set.add(row.userId);
		voted.set(row.sittingId, set);
	}
	const turnouts = [...voted.entries()].flatMap(([sittingId, voters]) => {
		const size = people.get(sittingId)?.size ?? 0;
		return size > 0 ? [Math.min(1, voters.size / size)] : [];
	});

	const withBook = sittings.filter(
		(row): row is ClubSittingRow & { bookPages: number; bookTitle: string } =>
			row.bookPages != null && row.bookTitle != null,
	);
	const byPages = [...withBook].sort((a, b) => a.bookPages - b.bookPages);
	const longest = byPages[byPages.length - 1];
	const shortest = byPages[0];

	return {
		total: sittings.length,
		finished: sittings.filter((row) => row.status === "finished").length,
		reading: sittings.filter((row) => row.status === "reading").length,
		voting: sittings.filter((row) => row.status === "voting").length,
		participations: participations.length,
		participants: new Set(participations.map((row) => row.userId)).size,
		averageParticipants: people.size
			? round1(participations.length / people.size)
			: 0,
		completed,
		didNotFinish,
		inProgress: count("in_progress"),
		notStarted: count("not_started"),
		completionRate: pct(completed, over),
		dnfRate: pct(didNotFinish, over),
		votes: votes.length,
		voters: new Set(votes.map((row) => row.userId)).size,
		turnout: turnouts.length
			? Math.round(
					(turnouts.reduce((a, b) => a + b, 0) / turnouts.length) * 100,
				)
			: null,
		averageVotesPerSitting: sittings.length
			? round1(votes.length / sittings.length)
			: 0,
		averageBookPages: withBook.length
			? Math.round(
					withBook.reduce((sum, row) => sum + row.bookPages, 0) /
						withBook.length,
				)
			: null,
		longestBook: longest
			? { title: longest.bookTitle, pages: longest.bookPages }
			: null,
		shortestBook: shortest
			? { title: shortest.bookTitle, pages: shortest.bookPages }
			: null,
	};
}

export type SittingMonth = {
	monthKey: string;
	label: string;
	/** Sittings started this month. */
	sittings: number;
	/** People who joined a sitting this month. */
	joined: number;
};

export function sittingsByMonth(
	sittings: readonly ClubSittingRow[],
	participations: readonly ClubParticipationRow[],
	bounds: UserStatsPeriodBounds,
	locale?: string,
): SittingMonth[] {
	const key = (date: Date) =>
		monthSortKey({
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
		});
	const started = new Map<number, number>();
	for (const row of sittings)
		started.set(key(row.createdAt), (started.get(key(row.createdAt)) ?? 0) + 1);
	const joined = new Map<number, number>();
	for (const row of participations)
		joined.set(key(row.joinedAt), (joined.get(key(row.joinedAt)) ?? 0) + 1);

	const multiYear = bounds.start.year !== bounds.end.year;
	return enumerateMonthsInBounds(bounds).map((month) => ({
		monthKey: `${month.year}-${String(month.month).padStart(2, "0")}`,
		label: new Intl.DateTimeFormat(locale, {
			month: "short",
			year: multiYear ? "2-digit" : undefined,
			timeZone: "UTC",
		}).format(new Date(Date.UTC(month.year, month.month - 1, 1))),
		sittings: started.get(monthSortKey(month)) ?? 0,
		joined: joined.get(monthSortKey(month)) ?? 0,
	}));
}

const SIZE_BUCKETS = ["1", "2", "3", "4", "5-6", "7+"] as const;

/** How many sittings had one, two, three ... people in them. */
export function participantsPerSitting(
	participations: readonly ClubParticipationRow[],
): { label: string; count: number }[] {
	const people = new Map<string, Set<string>>();
	for (const row of participations) {
		const set = people.get(row.sittingId) ?? new Set<string>();
		set.add(row.userId);
		people.set(row.sittingId, set);
	}
	const bucket = (size: number) =>
		size <= 4 ? String(size) : size <= 6 ? "5-6" : "7+";
	const counts = new Map<string, number>();
	for (const set of people.values()) {
		counts.set(bucket(set.size), (counts.get(bucket(set.size)) ?? 0) + 1);
	}
	return SIZE_BUCKETS.map((label) => ({
		label,
		count: counts.get(label) ?? 0,
	}));
}

export type SittingOutcome = {
	sittingId: string;
	participants: number;
	completed: number;
	/** Of the people in it who finished or gave up, how many finished. Null while nobody has. */
	rate: number | null;
};

export function sittingOutcomes(
	participations: readonly ClubParticipationRow[],
): Map<string, SittingOutcome> {
	const map = new Map<string, SittingOutcome & { dnf: number }>();
	for (const row of participations) {
		const entry = map.get(row.sittingId) ?? {
			sittingId: row.sittingId,
			participants: 0,
			completed: 0,
			dnf: 0,
			rate: null,
		};
		entry.participants += 1;
		if (row.progress === "completed") entry.completed += 1;
		if (row.progress === "dnf") entry.dnf += 1;
		map.set(row.sittingId, entry);
	}
	return new Map(
		[...map.entries()].map(([id, entry]) => [
			id,
			{
				sittingId: id,
				participants: entry.participants,
				completed: entry.completed,
				rate: pct(entry.completed, entry.completed + entry.dnf),
			},
		]),
	);
}

/** Counts by label, biggest first, as a ranked list with each one's share of the total. */
export function shareBreakdown(
	counts: readonly { label: string; count: number }[],
): { label: string; count: number; percent: number }[] {
	const total = counts.reduce((sum, row) => sum + row.count, 0);
	return counts
		.filter((row) => row.count > 0)
		.map((row) => ({
			...row,
			percent: total ? Math.round((row.count / total) * 100) : 0,
		}))
		.sort((a, b) => b.count - a.count);
}
