import { countries } from "country-data-list";

/** Mirrors the poll enums in `post-poll.prisma` — keep in sync. */
export const POST_POLL_TYPES = ["single", "multiple", "ranking"] as const;
export type PostPollType = (typeof POST_POLL_TYPES)[number];

export const POST_POLL_OPTION_KINDS = [
	"text",
	"book",
	"author",
	"series",
	"country",
	"user",
] as const;
export type PostPollOptionKind = (typeof POST_POLL_OPTION_KINDS)[number];

export const POST_POLL_RESULTS_VISIBILITY = [
	"everyone",
	"voters",
	"owner",
	"after_deadline",
] as const;
export type PostPollResultsVisibility =
	(typeof POST_POLL_RESULTS_VISIBILITY)[number];

/** From most hidden to most open. */
export const POST_POLL_BALLOT_VISIBILITY = [
	"secret",
	"turnout",
	"owner",
	"voters",
	"public",
] as const;
export type PostPollBallotVisibility =
	(typeof POST_POLL_BALLOT_VISIBILITY)[number];

export const POST_POLL_TYPE_LABELS: Record<PostPollType, string> = {
	single: "Single choice",
	multiple: "Multiple choice",
	ranking: "Ranking",
};

export const POST_POLL_TYPE_HINTS: Record<PostPollType, string> = {
	single: "Everyone picks one option.",
	multiple: "Everyone picks several options.",
	ranking: "Everyone puts their favourites in order.",
};

export const POST_POLL_OPTION_KIND_LABELS: Record<PostPollOptionKind, string> =
	{
		text: "Text",
		book: "Books",
		author: "Authors",
		series: "Series",
		country: "Countries",
		user: "Members",
	};

export const POST_POLL_RESULTS_LABELS: Record<
	PostPollResultsVisibility,
	{ label: string; hint: string }
> = {
	everyone: {
		label: "Everyone",
		hint: "Anyone can see the results, even before voting.",
	},
	voters: {
		label: "After voting",
		hint: "People see the results once they have voted.",
	},
	after_deadline: {
		label: "After it ends",
		hint: "Results stay hidden until the poll ends. Needs a deadline.",
	},
	owner: {
		label: "Only me",
		hint: "Only you (and admins) see the results.",
	},
};

export const POST_POLL_BALLOT_LABELS: Record<
	PostPollBallotVisibility,
	{ label: string; hint: string }
> = {
	secret: {
		label: "Secret",
		hint: "Nobody sees who voted or what they chose, not even you.",
	},
	turnout: {
		label: "Turnout only",
		hint: "You see who voted, but not what they chose.",
	},
	owner: {
		label: "Owner sees ballots",
		hint: "You see who chose what. Other members only see totals.",
	},
	voters: {
		label: "Voters see ballots",
		hint: "You and everyone who voted see who chose what.",
	},
	public: {
		label: "Public ballots",
		hint: "Every member sees who chose what.",
	},
};

export const POST_POLL_LIMITS = {
	minOptions: 2,
	maxOptions: 20,
	optionTextMax: 80,
	minDeadlineMinutes: 5,
	maxDeadlineDays: 90,
	/** How many names are listed under an option when ballots are visible. */
	maxVotersListed: 40,
} as const;

/** Vote counts at which the poll owner gets a notification. */
export const POST_POLL_VOTE_MILESTONES = [
	1, 5, 10, 25, 50, 100, 250, 500,
] as const;

// ── State and visibility ───────────────────────────────────────────────────

export function pollEnded(
	poll: { deadline: Date | null; closedAt: Date | null },
	now: Date = new Date(),
): boolean {
	return (
		poll.closedAt != null ||
		(poll.deadline != null && poll.deadline.getTime() <= now.getTime())
	);
}

type Viewer = { isOwner: boolean; isAdmin: boolean; hasVoted: boolean };

/** The owner and admins always see live results. */
export function canSeeResults(
	visibility: PostPollResultsVisibility,
	viewer: Viewer & { ended: boolean },
): boolean {
	if (viewer.isOwner || viewer.isAdmin) {
		return true;
	}
	switch (visibility) {
		case "everyone":
			return true;
		case "voters":
			return viewer.hasVoted;
		case "after_deadline":
			return viewer.ended;
		case "owner":
			return false;
	}
}

export type BallotAccess = "none" | "turnout" | "ballots";

/**
 * How much of other people's ballots a viewer may see. Ballots are never shown
 * to someone who cannot see the results, so a hidden tally cannot leak through names.
 */
export function ballotAccess(
	visibility: PostPollBallotVisibility,
	viewer: Viewer & { resultsVisible: boolean },
): BallotAccess {
	const staff = viewer.isOwner || viewer.isAdmin;
	switch (visibility) {
		case "secret":
			return "none";
		case "turnout":
			return staff ? "turnout" : "none";
		case "owner":
			return staff ? "ballots" : "none";
		case "voters":
			if (staff) return "ballots";
			return viewer.hasVoted && viewer.resultsVisible ? "ballots" : "none";
		case "public":
			return viewer.resultsVisible || staff ? "ballots" : "none";
	}
}

/** Loosening ballot privacy after votes exist would expose people, so only tightening is allowed then. */
export function isTighterOrEqualBallotVisibility(
	next: PostPollBallotVisibility,
	current: PostPollBallotVisibility,
): boolean {
	return (
		POST_POLL_BALLOT_VISIBILITY.indexOf(next) <=
		POST_POLL_BALLOT_VISIBILITY.indexOf(current)
	);
}

// ── Ballots and tallies ────────────────────────────────────────────────────

export type PollChoiceConfig = {
	type: PostPollType;
	minChoices: number;
	maxChoices: number;
};

/** Clamp the choice limits so they make sense for the type and the options. */
export function normalizeChoiceLimits(
	type: PostPollType,
	minChoices: number | null | undefined,
	maxChoices: number | null | undefined,
	optionCount: number,
): { minChoices: number; maxChoices: number } {
	if (type === "single") {
		return { minChoices: 1, maxChoices: 1 };
	}
	const cap = Math.max(2, optionCount);
	const max = Math.min(Math.max(2, maxChoices ?? cap), cap);
	const min = Math.min(Math.max(1, minChoices ?? 1), max);
	return { minChoices: min, maxChoices: max };
}

/**
 * What is wrong with a ballot or a new poll, as a stable key with parameters (the API turns it
 * into an error in the viewer's language; `describePollProblem` gives the English sentence).
 */
export type PollProblem = {
	key:
		| "pickOnce"
		| "optionNotOnPoll"
		| "pickOne"
		| "pickAtLeast"
		| "pickAtMost"
		| "rankAtLeast"
		| "rankAtMost"
		| "addMinOptions"
		| "tooManyOptions"
		| "choicesOrder"
		| "choicesOverOptions"
		| "resultsNeedDeadline"
		| "deadlineTooSoon"
		| "deadlineTooFar"
		| "memberLimitsMissing"
		| "memberLimitOverTotal"
		| "optionsOverLimit";
	params: Record<string, number>;
};

const plural = (count: number, one: string, other: string) =>
	`${count} ${count === 1 ? one : other}`;

/** The English sentence of a poll problem (the web form shows it until it is translated). */
export function describePollProblem(problem: PollProblem): string {
	const { key, params } = problem;
	const n = params.count ?? params.min ?? params.max ?? 0;
	switch (key) {
		case "pickOnce":
			return "Pick each option only once.";
		case "optionNotOnPoll":
			return "One of those options is not on this poll.";
		case "pickOne":
			return "Pick one option.";
		case "pickAtLeast":
			return `Please pick at least ${plural(n, "option", "options")}.`;
		case "pickAtMost":
			return `Please pick at most ${plural(n, "option", "options")}.`;
		case "rankAtLeast":
			return `Please rank at least ${plural(n, "option", "options")}.`;
		case "rankAtMost":
			return `Please rank at most ${plural(n, "option", "options")}.`;
		case "addMinOptions":
			return `Add at least ${n} options.`;
		case "tooManyOptions":
			return `A poll can have at most ${n} options.`;
		case "choicesOrder":
			return "The fewest choices cannot be more than the most.";
		case "choicesOverOptions":
			return "Members cannot pick more options than the poll has.";
		case "resultsNeedDeadline":
			return "Showing results after the deadline needs a deadline.";
		case "deadlineTooSoon":
			return `The deadline must be at least ${n} minutes away.`;
		case "deadlineTooFar":
			return `The deadline can be at most ${n} days away.`;
		case "memberLimitsMissing":
			return "Set how many options each member and everyone together may add.";
		case "memberLimitOverTotal":
			return "Each member's limit cannot be higher than the total limit.";
		case "optionsOverLimit":
			return `Your options plus the ones members may add cannot go over ${n}.`;
	}
}

/** The first problem with a ballot, or null when it is valid. */
export function ballotProblem(
	config: PollChoiceConfig,
	pickedOptionIds: readonly string[],
	validOptionIds: ReadonlySet<string>,
): PollProblem | null {
	if (new Set(pickedOptionIds).size !== pickedOptionIds.length) {
		return { key: "pickOnce", params: {} };
	}
	if (pickedOptionIds.some((id) => !validOptionIds.has(id))) {
		return { key: "optionNotOnPoll", params: {} };
	}
	const count = pickedOptionIds.length;
	if (config.type === "single") {
		return count === 1 ? null : { key: "pickOne", params: {} };
	}
	const ranking = config.type === "ranking";
	if (count < config.minChoices) {
		return {
			key: ranking ? "rankAtLeast" : "pickAtLeast",
			params: { count: config.minChoices },
		};
	}
	if (count > config.maxChoices) {
		return {
			key: ranking ? "rankAtMost" : "pickAtMost",
			params: { count: config.maxChoices },
		};
	}
	return null;
}

/** Returns a message when the picked options are not a valid ballot, otherwise null. */
export function validateBallot(
	config: PollChoiceConfig,
	pickedOptionIds: readonly string[],
	validOptionIds: ReadonlySet<string>,
): string | null {
	const problem = ballotProblem(config, pickedOptionIds, validOptionIds);
	return problem ? describePollProblem(problem) : null;
}

export type BallotRow = {
	userId: string;
	optionId: string;
	rank: number | null;
};

export type OptionTally = {
	optionId: string;
	/** Ballots that include this option. */
	voters: number;
	/** Ballots that put it first (single and multiple choice count every pick). */
	firstChoices: number;
	/** Borda points on ranking polls (first place earns the most); the vote count otherwise. */
	points: number;
	/** Sum of the positions it was ranked at, so the average is `rankSum / voters`. */
	rankSum: number;
	/** Share of the whole: of voters, or of all points on a ranking poll. 0 to 1. */
	share: number;
};

export function tallyBallots(
	config: PollChoiceConfig,
	optionIds: readonly string[],
	rows: readonly BallotRow[],
): { totalVoters: number; options: OptionTally[] } {
	const byOption = new Map<string, Omit<OptionTally, "share">>(
		optionIds.map((optionId) => [
			optionId,
			{ optionId, voters: 0, firstChoices: 0, points: 0, rankSum: 0 },
		]),
	);
	const voterIds = new Set<string>();
	const ranking = config.type === "ranking";

	for (const row of rows) {
		const tally = byOption.get(row.optionId);
		if (!tally) continue;
		voterIds.add(row.userId);
		tally.voters += 1;
		if (ranking && row.rank != null) {
			tally.points += Math.max(0, config.maxChoices - row.rank + 1);
			tally.rankSum += row.rank;
			if (row.rank === 1) tally.firstChoices += 1;
		} else {
			tally.points += 1;
			tally.firstChoices += 1;
		}
	}

	const totalVoters = voterIds.size;
	const totalPoints = [...byOption.values()].reduce(
		(sum, tally) => sum + tally.points,
		0,
	);

	return {
		totalVoters,
		options: [...byOption.values()].map((tally) => ({
			...tally,
			share: ranking
				? totalPoints > 0
					? tally.points / totalPoints
					: 0
				: totalVoters > 0
					? tally.voters / totalVoters
					: 0,
		})),
	};
}

// ── Duplicates ─────────────────────────────────────────────────────────────

export function textDedupeKey(text: string): string {
	const folded = text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
	return `text:${folded}`;
}

export function refDedupeKey(kind: PostPollOptionKind, key: string): string {
	return `${kind}:${key}`;
}

// ── Setup validation ───────────────────────────────────────────────────────

export type PollSetup = {
	type: PostPollType;
	optionKind: PostPollOptionKind;
	optionCount: number;
	minChoices: number;
	maxChoices: number;
	allowUserOptions: boolean;
	maxOptionsPerUser: number | null;
	maxOptionsTotal: number | null;
	resultsVisibility: PostPollResultsVisibility;
	deadline: Date | null;
};

/** The first problem with a new poll, as a stable key with parameters, or null when it is fine. */
export function pollSetupProblem(
	setup: PollSetup,
	now: Date = new Date(),
): PollProblem | null {
	if (setup.optionCount < POST_POLL_LIMITS.minOptions) {
		return {
			key: "addMinOptions",
			params: { min: POST_POLL_LIMITS.minOptions },
		};
	}
	if (setup.optionCount > POST_POLL_LIMITS.maxOptions) {
		return {
			key: "tooManyOptions",
			params: { max: POST_POLL_LIMITS.maxOptions },
		};
	}
	if (setup.type !== "single") {
		if (setup.minChoices > setup.maxChoices) {
			return { key: "choicesOrder", params: {} };
		}
		if (setup.maxChoices > setup.optionCount && !setup.allowUserOptions) {
			return { key: "choicesOverOptions", params: {} };
		}
	}
	if (setup.resultsVisibility === "after_deadline" && !setup.deadline) {
		return { key: "resultsNeedDeadline", params: {} };
	}
	if (setup.deadline) {
		const minutes = (setup.deadline.getTime() - now.getTime()) / 60_000;
		if (minutes < POST_POLL_LIMITS.minDeadlineMinutes) {
			return {
				key: "deadlineTooSoon",
				params: { min: POST_POLL_LIMITS.minDeadlineMinutes },
			};
		}
		if (minutes > POST_POLL_LIMITS.maxDeadlineDays * 24 * 60) {
			return {
				key: "deadlineTooFar",
				params: { max: POST_POLL_LIMITS.maxDeadlineDays },
			};
		}
	}
	if (setup.allowUserOptions) {
		const perUser = setup.maxOptionsPerUser;
		const total = setup.maxOptionsTotal;
		if (perUser == null || total == null || perUser < 1 || total < 1) {
			return { key: "memberLimitsMissing", params: {} };
		}
		if (perUser > total) {
			return { key: "memberLimitOverTotal", params: {} };
		}
		if (setup.optionCount + total > POST_POLL_LIMITS.maxOptions) {
			return {
				key: "optionsOverLimit",
				params: { max: POST_POLL_LIMITS.maxOptions },
			};
		}
	}
	return null;
}

/** A message for the first problem with a new poll, or null when it is fine. */
export function validatePollSetup(
	setup: PollSetup,
	now: Date = new Date(),
): string | null {
	const problem = pollSetupProblem(setup, now);
	return problem ? describePollProblem(problem) : null;
}

// ── Countries ──────────────────────────────────────────────────────────────

type CountryRow = { alpha2?: string; name?: string; status?: string };

export function searchPollCountries(
	query: string,
	limit = 8,
): { code: string; name: string }[] {
	const needle = query.trim().toLowerCase();
	if (needle.length === 0) return [];
	return (countries.all as CountryRow[])
		.filter((row): row is Required<Pick<CountryRow, "alpha2" | "name">> =>
			Boolean(row.alpha2 && row.name && row.status !== "deleted"),
		)
		.filter(
			(row) =>
				row.name.toLowerCase().includes(needle) ||
				row.alpha2.toLowerCase() === needle,
		)
		.slice(0, limit)
		.map((row) => ({ code: row.alpha2.toUpperCase(), name: row.name }));
}
