const MS_PER_DAY = 86_400_000;

export type ReadingPlanInput = {
	pageCount: number;
	weekdayMinutes?: number;
	weekendMinutes?: number;
	wordsPerPage?: number;
	wpm?: number;
	bufferMultiplier?: number;
	startDate?: Date;
};

export type ReadingPlanResult = {
	totalReadingMinutes: number;
	bufferedReadingMinutes: number;
	weeklyCapacityMinutes: number;
	rawDaysRequired: number;
	targetDays: number;
	bufferedTargetDays: number;
	endDate?: Date;
	calendarDaysSpanned?: number;
};

const DEFAULT_WEEKDAY_MINUTES = 20;
const DEFAULT_WEEKEND_MINUTES = 45;
const DEFAULT_WPM = 230;
const DEFAULT_WORDS_PER_PAGE = 275;

function assertPositive(value: number, label: string) {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a number greater than 0.`);
	}
}

function assertNonNegative(value: number, label: string) {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${label} must be a number greater than or equal to 0.`);
	}
}

export function startOfLocalDay(date: Date): Date {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

export function endOfLocalDay(date: Date): Date {
	const next = new Date(date);
	next.setHours(23, 59, 59, 999);
	return next;
}

function minutesAvailableOnDay(
	date: Date,
	weekdayMinutes: number,
	weekendMinutes: number,
): number {
	const day = date.getDay();
	return day === 0 || day === 6 ? weekendMinutes : weekdayMinutes;
}

export function calculateEndDateFromCalendar(
	startDate: Date,
	minutesNeeded: number,
	weekdayMinutes: number,
	weekendMinutes: number,
): { endDate: Date; calendarDaysSpanned: number } {
	assertPositive(minutesNeeded, "Minutes needed");

	let remaining = minutesNeeded;
	const cursor = startOfLocalDay(startDate);
	let calendarDaysSpanned = 0;
	const maxDays = 366 * 10;

	while (remaining > 0) {
		if (calendarDaysSpanned >= maxDays) {
			throw new Error(
				"Could not reach deadline within 10 years — check minutes per day.",
			);
		}

		const dayCapacity = minutesAvailableOnDay(
			cursor,
			weekdayMinutes,
			weekendMinutes,
		);

		if (dayCapacity <= 0) {
			cursor.setTime(cursor.getTime() + MS_PER_DAY);
			calendarDaysSpanned += 1;
			continue;
		}

		remaining -= dayCapacity;
		calendarDaysSpanned += 1;

		if (remaining > 0) {
			cursor.setTime(cursor.getTime() + MS_PER_DAY);
		}
	}

	return { endDate: cursor, calendarDaysSpanned };
}

export function calculateReadingDeadline(
	input: ReadingPlanInput,
): ReadingPlanResult {
	const {
		pageCount,
		weekdayMinutes = DEFAULT_WEEKDAY_MINUTES,
		weekendMinutes = DEFAULT_WEEKEND_MINUTES,
		wordsPerPage = DEFAULT_WORDS_PER_PAGE,
		wpm = DEFAULT_WPM,
		bufferMultiplier = 1.25,
		startDate,
	} = input;

	assertPositive(pageCount, "Page count");
	assertPositive(wpm, "WPM");
	assertPositive(wordsPerPage, "Words per page");
	assertPositive(bufferMultiplier, "Buffer multiplier");
	assertNonNegative(weekdayMinutes, "Weekday minutes");
	assertNonNegative(weekendMinutes, "Weekend minutes");

	const weeklyCapacityMinutes = 5 * weekdayMinutes + 2 * weekendMinutes;
	if (weeklyCapacityMinutes <= 0) {
		throw new Error("Weekly reading capacity must be greater than 0 minutes.");
	}

	const totalWords = pageCount * wordsPerPage;
	const totalReadingMinutes = totalWords / wpm;
	const bufferedReadingMinutes = totalReadingMinutes * bufferMultiplier;
	const rawDaysRequired = (totalReadingMinutes / weeklyCapacityMinutes) * 7;

	const result: ReadingPlanResult = {
		totalReadingMinutes: Math.round(totalReadingMinutes),
		bufferedReadingMinutes: Math.round(bufferedReadingMinutes),
		weeklyCapacityMinutes,
		rawDaysRequired: Number(rawDaysRequired.toFixed(1)),
		targetDays: Math.max(1, Math.round(rawDaysRequired)),
		bufferedTargetDays: Math.max(
			1,
			Math.round(rawDaysRequired * bufferMultiplier),
		),
	};

	if (startDate) {
		const { endDate, calendarDaysSpanned } = calculateEndDateFromCalendar(
			startDate,
			totalReadingMinutes,
			weekdayMinutes,
			weekendMinutes,
		);
		result.endDate = endDate;
		result.calendarDaysSpanned = calendarDaysSpanned;
	}

	return result;
}

/** Club reading deadline from page count (Mon–Fri / weekend reading minutes). */
export function calculateSittingReadingDeadline(
	pageCount: number,
	startDate = new Date(),
): Date {
	const plan = calculateReadingDeadline({
		pageCount,
		startDate: startOfLocalDay(startDate),
	});

	if (!plan.endDate) {
		throw new Error("Could not calculate sitting reading deadline");
	}

	return plan.endDate;
}

/** @deprecated Use {@link defaultPollDeadline} from `./scheduled-deadlines.js`. */
export function legacyDefaultPollDeadline(from = new Date()): Date {
	const deadline = new Date(from.getTime() + 12 * 60 * 60 * 1000);
	deadline.setSeconds(0, 0);
	deadline.setMilliseconds(0);
	return deadline;
}

/** Placeholder until a book is chosen and the reading schedule is computed. */
export function sittingReadingDeadlinePlaceholder(from = new Date()): Date {
	return new Date(from.getTime() + 400 * MS_PER_DAY);
}
