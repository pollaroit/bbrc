import { getZonedParts } from "../club-timezone";
import type { AchievementFacts, MetricKey, Point } from "./types";

/** Decides whether an event belongs to the period being measured (a year, or everything). */
export type InWindow = (periodDate: Date) => boolean;

type Metric = (facts: AchievementFacts, inWindow: InWindow) => Point[];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const byTime = <T extends { at: Date }>(a: T, b: T) =>
	a.at.getTime() - b.at.getTime();

type Event = { at: Date; period: Date };

/** 1, 2, 3 … at each event. */
function countPoints(events: readonly Event[], inWindow: InWindow): Point[] {
	return events
		.filter((event) => inWindow(event.period))
		.sort(byTime)
		.map((event, index) => ({ at: event.at, value: index + 1 }));
}

/** Running total of `amount`. */
function sumPoints(
	events: readonly (Event & { amount: number })[],
	inWindow: InWindow,
): Point[] {
	let total = 0;
	return events
		.filter((event) => inWindow(event.period))
		.sort(byTime)
		.map((event) => {
			total += event.amount;
			return { at: event.at, value: total };
		});
}

/** How many different keys have been seen so far; a point only when a new key appears. */
function distinctPoints(
	events: readonly (Event & { keys: readonly string[] })[],
	inWindow: InWindow,
): Point[] {
	const seen = new Set<string>();
	const points: Point[] = [];
	for (const event of events
		.filter((item) => inWindow(item.period))
		.sort(byTime)) {
		const before = seen.size;
		for (const key of event.keys) {
			if (key) seen.add(key);
		}
		if (seen.size > before) {
			points.push({ at: event.at, value: seen.size });
		}
	}
	return points;
}

/** Keeps only the moments the running maximum goes up. */
function maxPoints(raw: readonly Point[]): Point[] {
	let best = 0;
	const points: Point[] = [];
	for (const point of [...raw].sort(byTime)) {
		if (point.value > best) {
			best = point.value;
			points.push({ at: point.at, value: best });
		}
	}
	return points;
}

function utcParts(date: Date) {
	return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function zonedHour(date: Date, timeZone: string): number {
	return getZonedParts(date, timeZone).hour % 24;
}

function zonedDayKey(date: Date, timeZone: string): string {
	const parts = getZonedParts(date, timeZone);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

const readEvents = (facts: AchievementFacts) =>
	facts.reads.map((read) => ({ ...read, at: read.at, period: read.period }));

const completedParticipations = (facts: AchievementFacts) =>
	facts.participations.filter((item) => item.progress === "completed");

function openedPoints(fact: { opens: number; at: Date } | null): Point[] {
	return fact && fact.opens > 0 ? [{ at: fact.at, value: fact.opens }] : [];
}

export const METRICS: Record<MetricKey, Metric> = {
	reads: (facts, inWindow) => countPoints(readEvents(facts), inWindow),

	pages: (facts, inWindow) =>
		sumPoints(
			readEvents(facts).map((read) => ({ ...read, amount: read.pages })),
			inWindow,
		),

	countries: (facts, inWindow) =>
		distinctPoints(
			readEvents(facts).map((read) => ({ ...read, keys: read.countries })),
			inWindow,
		),

	authors: (facts, inWindow) =>
		distinctPoints(
			readEvents(facts).map((read) => ({ ...read, keys: read.authors })),
			inWindow,
		),

	loyalAuthor: (facts, inWindow) => {
		const counts = new Map<string, number>();
		const raw: Point[] = [];
		for (const read of readEvents(facts)
			.filter((item) => inWindow(item.period))
			.sort(byTime)) {
			for (const author of new Set(read.authors)) {
				const next = (counts.get(author) ?? 0) + 1;
				counts.set(author, next);
				raw.push({ at: read.at, value: next });
			}
		}
		return maxPoints(raw);
	},

	seriesDone: (facts, inWindow) => {
		const firstReadAt = new Map<string, Date>();
		for (const read of readEvents(facts)
			.filter((item) => inWindow(item.period))
			.sort(byTime)) {
			if (!firstReadAt.has(read.bookId)) {
				firstReadAt.set(read.bookId, read.at);
			}
		}
		const done: Event[] = [];
		for (const series of facts.series) {
			if (series.bookIds.length < 2) continue;
			const times = series.bookIds.map((id) => firstReadAt.get(id));
			if (times.every((time): time is Date => time != null)) {
				const at = new Date(Math.max(...times.map((time) => time.getTime())));
				done.push({ at, period: at });
			}
		}
		return countPoints(done, () => true);
	},

	classics: (facts, inWindow) =>
		countPoints(
			readEvents(facts).filter(
				(read) => read.publishedIn > 0 && read.publishedIn < 1950,
			),
			inWindow,
		),

	doorstoppers: (facts, inWindow) =>
		countPoints(
			readEvents(facts).filter((read) => read.pages >= 800),
			inWindow,
		),

	quickReads: (facts, inWindow) =>
		countPoints(
			readEvents(facts).filter((read) => read.pages > 0 && read.pages <= 150),
			inWindow,
		),

	decades: (facts, inWindow) =>
		distinctPoints(
			readEvents(facts).map((read) => ({
				...read,
				keys:
					read.publishedIn > 0
						? [String(Math.floor(read.publishedIn / 10))]
						: [],
			})),
			inWindow,
		),

	readingMonths: (facts, inWindow) =>
		distinctPoints(
			readEvents(facts).map((read) => {
				const { year, month } = utcParts(read.period);
				return { ...read, keys: [`${year}-${month}`] };
			}),
			inWindow,
		),

	firstReaders: (facts, inWindow) => {
		const first = new Set(facts.firstReadBookIds);
		return countPoints(
			readEvents(facts).filter((read) => first.has(read.bookId)),
			inWindow,
		);
	},

	bingeDay: (facts, inWindow) => {
		const perDay = new Map<string, number>();
		const raw: Point[] = [];
		for (const read of readEvents(facts)
			.filter((item) => inWindow(item.period))
			.sort(byTime)) {
			const key = zonedDayKey(read.at, facts.timeZone);
			const next = (perDay.get(key) ?? 0) + 1;
			perDay.set(key, next);
			raw.push({ at: read.at, value: next });
		}
		return maxPoints(raw);
	},

	sittingsDone: (facts, inWindow) =>
		countPoints(
			completedParticipations(facts).map((item) => ({
				at: item.completedAt,
				period: item.deadline,
			})),
			inWindow,
		),

	sittingStreak: (facts, inWindow) => {
		let current = 0;
		const raw: Point[] = [];
		for (const item of facts.participations
			.filter((participation) => inWindow(participation.deadline))
			.sort((a, b) => a.deadline.getTime() - b.deadline.getTime())) {
			if (item.progress === "completed") {
				current += 1;
				raw.push({ at: item.completedAt, value: current });
			} else {
				current = 0;
			}
		}
		return maxPoints(raw);
	},

	perfectAttendance: (facts, inWindow) => {
		const inPeriod = facts.participations.filter((item) =>
			inWindow(item.deadline),
		);
		if (inPeriod.length === 0) return [];
		const everyoneFinished = inPeriod.every(
			(item) => item.progress === "completed",
		);
		if (!everyoneFinished) return [];
		const lastDeadline = new Date(
			Math.max(...inPeriod.map((item) => item.deadline.getTime())),
		);
		return [{ at: lastDeadline, value: inPeriod.length }];
	},

	earlyFinishes: (facts, inWindow) =>
		countPoints(
			completedParticipations(facts)
				.filter(
					(item) =>
						item.deadline.getTime() - item.completedAt.getTime() >= 3 * DAY_MS,
				)
				.map((item) => ({ at: item.completedAt, period: item.deadline })),
			inWindow,
		),

	photoFinishes: (facts, inWindow) =>
		countPoints(
			completedParticipations(facts)
				.filter((item) => {
					const left = item.deadline.getTime() - item.completedAt.getTime();
					return left >= 0 && left <= 3 * HOUR_MS;
				})
				.map((item) => ({ at: item.completedAt, period: item.deadline })),
			inWindow,
		),

	redemptions: (facts, inWindow) => {
		const ordered = facts.participations
			.filter((item) => inWindow(item.deadline))
			.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
		const events: Event[] = [];
		ordered.forEach((item, index) => {
			if (
				item.progress === "completed" &&
				ordered[index - 1]?.progress === "dnf"
			) {
				events.push({ at: item.completedAt, period: item.deadline });
			}
		});
		return countPoints(events, () => true);
	},

	pollsVoted: (facts, inWindow) =>
		countPoints(
			facts.votes.map((vote) => ({
				at: vote.votedAt,
				period: vote.pollClosesAt,
			})),
			inWindow,
		),

	winningPicks: (facts, inWindow) =>
		countPoints(
			facts.votes
				.filter((vote) => vote.closed && vote.pickedWinner)
				.map((vote) => ({ at: vote.pollClosesAt, period: vote.pollClosesAt })),
			inWindow,
		),

	pickStreak: (facts, inWindow) => {
		let current = 0;
		const raw: Point[] = [];
		for (const vote of facts.votes
			.filter((item) => item.closed && inWindow(item.pollClosesAt))
			.sort((a, b) => a.pollClosesAt.getTime() - b.pollClosesAt.getTime())) {
			current = vote.pickedWinner ? current + 1 : 0;
			if (vote.pickedWinner) {
				raw.push({ at: vote.pollClosesAt, value: current });
			}
		}
		return maxPoints(raw);
	},

	reviews: (facts, inWindow) =>
		countPoints(
			facts.feedbacks.map((item) => ({
				at: item.createdAt,
				period: item.createdAt,
			})),
			inWindow,
		),

	longReviews: (facts, inWindow) =>
		countPoints(
			facts.feedbacks
				.filter((item) => item.length >= 300)
				.map((item) => ({ at: item.createdAt, period: item.createdAt })),
			inWindow,
		),

	reviewLikes: (facts, inWindow) => {
		const raw: Point[] = [];
		for (const feedback of facts.feedbacks) {
			feedback.likeTimes
				.filter((time) => inWindow(time))
				.sort((a, b) => a.getTime() - b.getTime())
				.forEach((time, index) => {
					raw.push({ at: time, value: index + 1 });
				});
		}
		return maxPoints(raw);
	},

	likesReceived: (facts, inWindow) =>
		countPoints(
			facts.likesReceived.map((time) => ({ at: time, period: time })),
			inWindow,
		),

	posts: (facts, inWindow) =>
		countPoints(
			facts.posts.map((post) => ({
				at: post.createdAt,
				period: post.createdAt,
			})),
			inWindow,
		),

	tierlists: (facts, inWindow) =>
		countPoints(
			facts.posts
				.filter((post) => post.hasTierlist)
				.map((post) => ({ at: post.createdAt, period: post.createdAt })),
			inWindow,
		),

	postComments: (facts, inWindow) => {
		const raw: Point[] = [];
		for (const post of facts.posts) {
			post.commentTimes
				.filter((time) => inWindow(time))
				.sort((a, b) => a.getTime() - b.getTime())
				.forEach((time, index) => {
					raw.push({ at: time, value: index + 1 });
				});
		}
		return maxPoints(raw);
	},

	comments: (facts, inWindow) =>
		countPoints(
			facts.commentTimes.map((time) => ({ at: time, period: time })),
			inWindow,
		),

	nightPosts: (facts, inWindow) => {
		const times = [
			...facts.posts.map((post) => post.createdAt),
			...facts.commentTimes,
			...facts.feedbacks.map((item) => item.createdAt),
		].filter((time) => zonedHour(time, facts.timeZone) < 4);
		return countPoints(
			times.map((time) => ({ at: time, period: time })),
			inWindow,
		);
	},

	leapDay: (facts, inWindow) => {
		const times = [
			...facts.reads.map((read) => read.at),
			...facts.posts.map((post) => post.createdAt),
			...facts.commentTimes,
			...facts.feedbacks.map((item) => item.createdAt),
			...facts.votes.map((vote) => vote.votedAt),
		].filter((time) => {
			const parts = getZonedParts(time, facts.timeZone);
			return parts.month === 2 && parts.day === 29;
		});
		return countPoints(
			times.map((time) => ({ at: time, period: time })),
			inWindow,
		).slice(0, 1);
	},

	documents: (facts, inWindow) =>
		countPoints(
			facts.documentTimes.map((time) => ({ at: time, period: time })),
			inWindow,
		),

	requests: (facts, inWindow) =>
		countPoints(
			facts.requestedBookTimes.map((time) => ({ at: time, period: time })),
			inWindow,
		),

	shelves: (facts, inWindow) =>
		countPoints(
			facts.shelves.map((shelf) => ({
				at: shelf.createdAt,
				period: shelf.createdAt,
			})),
			inWindow,
		),

	shelfSize: (facts, inWindow) => {
		const raw: Point[] = [];
		for (const shelf of facts.shelves) {
			shelf.bookAddedTimes
				.filter((time) => inWindow(time))
				.sort((a, b) => a.getTime() - b.getTime())
				.forEach((time, index) => {
					raw.push({ at: time, value: index + 1 });
				});
		}
		return maxPoints(raw);
	},

	favorites: (facts, inWindow) =>
		countPoints(
			facts.favoriteTimes.map((time) => ({ at: time, period: time })),
			inWindow,
		),

	quizzes: (facts, inWindow) =>
		countPoints(
			facts.quizzes.map((quiz) => ({ at: quiz.at, period: quiz.at })),
			inWindow,
		),

	perfectQuizzes: (facts, inWindow) =>
		countPoints(
			facts.quizzes
				.filter((quiz) => quiz.perfect)
				.map((quiz) => ({ at: quiz.at, period: quiz.at })),
			inWindow,
		),

	goalsCreated: (facts, inWindow) =>
		countPoints(
			facts.goals.map((goal) => ({
				at: goal.createdAt,
				period: goal.createdAt,
			})),
			inWindow,
		),

	goalsDone: (facts, inWindow) =>
		countPoints(
			facts.goals.flatMap((goal) =>
				goal.completedAt
					? [{ at: goal.completedAt, period: goal.completedAt }]
					: [],
			),
			inWindow,
		),

	profile: (facts) => {
		const filled = [
			facts.user.hasAvatar,
			facts.profile?.hasBio ?? false,
			facts.profile?.hasLocation ?? false,
			facts.profile?.hasGenres ?? false,
		].filter(Boolean).length;
		if (filled === 0) return [];
		return [
			{ at: facts.profile?.updatedAt ?? facts.user.createdAt, value: filled },
		];
	},

	// Views are all-time: they ignore the yearly window, like tenure.
	postOpens: (facts) => openedPoints(facts.views.mostOpenedPost),
	reviewOpens: (facts) => openedPoints(facts.views.mostOpenedReview),
	profileOpens: (facts) => openedPoints(facts.views.profileOpens),

	// Reading sessions are all-time too, and never give XP, so they cannot be farmed.
	paceSetter: (facts, inWindow) =>
		countPoints(
			facts.reading.onTimeFinishes.map((at) => ({ at, period: at })),
			inWindow,
		),
	readingHours: (facts) => {
		const hours = Math.floor(facts.reading.sessionSeconds / 3600);
		return hours > 0 ? [{ at: facts.now, value: hours }] : [];
	},
	readingStreak: (facts) =>
		facts.reading.longestStreak && facts.reading.longestStreak.days > 0
			? [
					{
						at: facts.reading.longestStreak.at,
						value: facts.reading.longestStreak.days,
					},
				]
			: [],
	wishlistKeeper: (facts) =>
		facts.reading.wishlistSize > 0
			? [
					{
						at: facts.reading.wishlistAt ?? facts.user.createdAt,
						value: facts.reading.wishlistSize,
					},
				]
			: [],

	founder: (facts) =>
		facts.user.joinRank <= FOUNDING_MEMBER_COUNT
			? [{ at: facts.user.createdAt, value: 1 }]
			: [],

	tenure: (facts) => {
		const points: Point[] = [];
		for (let years = 1; years <= 10; years += 1) {
			const at = new Date(facts.user.createdAt);
			at.setUTCFullYear(at.getUTCFullYear() + years);
			if (at.getTime() > facts.now.getTime()) break;
			points.push({ at, value: years });
		}
		return points;
	},
};

/** The first this-many members to join count as founding members. */
export const FOUNDING_MEMBER_COUNT = 10;

export { DAY_MS };
