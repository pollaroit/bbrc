/** How a member is doing against a deadline, from their progress log. */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pace is judged on the last week of updates. */
const PACE_WINDOW_DAYS = 7;

export type PaceLog = { at: Date; percent: number; page: number | null };

export type PaceInput = {
	percent: number;
	totalPages: number | null;
	currentPage: number | null;
	startedAt: Date;
	logs: PaceLog[];
	/** The sitting's reading deadline, when this book is the sitting's. */
	deadline: Date | null;
	now: Date;
};

export type PaceStatus =
	| "done"
	| "no_deadline"
	| "no_data"
	| "ahead"
	| "on_track"
	| "behind"
	| "past_deadline";

export type PaceResult = {
	status: PaceStatus;
	/** What the numbers below are counted in. */
	unit: "pages" | "percent";
	remaining: number;
	/** Recent speed per day; null with nothing to go on yet. */
	perDayRecent: number | null;
	/** What it takes per day to make the deadline; null without a deadline. */
	perDayNeeded: number | null;
	projectedFinish: Date | null;
	/** Whole days between the projected finish and the deadline (positive = early). */
	daysEarly: number | null;
};

function amount(
	input: {
		percent: number;
		page: number | null;
		totalPages: number | null;
	},
	unit: "pages" | "percent",
) {
	return unit === "pages" ? (input.page ?? 0) : input.percent;
}

/** Works out recent speed, what the deadline needs, and where that leads. */
export function readingPace(input: PaceInput): PaceResult {
	const unit: "pages" | "percent" =
		input.totalPages != null && input.currentPage != null ? "pages" : "percent";
	const total = unit === "pages" ? (input.totalPages ?? 0) : 100;
	const current = amount(
		{
			percent: input.percent,
			page: input.currentPage,
			totalPages: input.totalPages,
		},
		unit,
	);
	const remaining = Math.max(0, total - current);

	const base = {
		unit,
		remaining,
		perDayRecent: null,
		perDayNeeded: null,
		projectedFinish: null,
		daysEarly: null,
	} satisfies Omit<PaceResult, "status">;

	if (remaining === 0 || input.percent >= 100) {
		return { ...base, remaining: 0, status: "done" };
	}

	// Speed: progress over the last week of updates (or since the start if shorter).
	const since = new Date(input.now.getTime() - PACE_WINDOW_DAYS * DAY_MS);
	const window = input.logs
		.filter((log) => log.at.getTime() >= since.getTime())
		.sort((a, b) => a.at.getTime() - b.at.getTime());
	const first = window[0];
	let perDayRecent: number | null = null;
	if (first) {
		const startAmount = amount(
			{
				percent: first.percent,
				page: first.page,
				totalPages: input.totalPages,
			},
			unit,
		);
		// Progress made since the first update in the window, over the days it took.
		const days = Math.max(
			1,
			(input.now.getTime() - first.at.getTime()) / DAY_MS,
		);
		perDayRecent = Math.max(0, (current - startAmount) / days);
		if (perDayRecent === 0) {
			// One update in the window: use the whole read so far instead.
			perDayRecent =
				current /
				Math.max(1, (input.now.getTime() - input.startedAt.getTime()) / DAY_MS);
		}
	} else if (current > 0) {
		perDayRecent =
			current /
			Math.max(1, (input.now.getTime() - input.startedAt.getTime()) / DAY_MS);
	}
	if (perDayRecent != null && perDayRecent <= 0) perDayRecent = null;

	const projectedFinish =
		perDayRecent != null
			? new Date(input.now.getTime() + (remaining / perDayRecent) * DAY_MS)
			: null;

	if (!input.deadline) {
		return {
			...base,
			status: perDayRecent == null ? "no_data" : "no_deadline",
			perDayRecent,
			projectedFinish,
		};
	}

	const daysLeft = (input.deadline.getTime() - input.now.getTime()) / DAY_MS;
	if (daysLeft <= 0) {
		return {
			...base,
			status: "past_deadline",
			perDayRecent,
			projectedFinish,
		};
	}
	const perDayNeeded = remaining / Math.max(1, Math.ceil(daysLeft));

	if (projectedFinish == null) {
		return { ...base, status: "no_data", perDayNeeded };
	}

	const daysEarly = Math.floor(
		(input.deadline.getTime() - projectedFinish.getTime()) / DAY_MS,
	);
	const status: PaceStatus =
		daysEarly >= 1 ? "ahead" : daysEarly > -1 ? "on_track" : "behind";
	return {
		...base,
		status,
		perDayRecent,
		perDayNeeded,
		projectedFinish,
		daysEarly,
	};
}

/** "23 pages", "8%": a rounded amount with its unit. */
export function formatPaceAmount(value: number, unit: "pages" | "percent") {
	const rounded = Math.max(1, Math.ceil(value));
	return unit === "pages"
		? `${rounded} ${rounded === 1 ? "page" : "pages"}`
		: `${rounded}%`;
}
