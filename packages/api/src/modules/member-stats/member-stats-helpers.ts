import type { Database, Prisma } from "@bbrc/db";
import type {
	UserStatsMonth,
	UserStatsPeriod,
	UserStatsPeriodBounds,
} from "@bbrc/shared";

/** The period as a person would say it: "All time", "2026", "June 2026", "Jan 2025 – Jun 2026". */
export function statsPeriodLabel(period: UserStatsPeriod): string {
	const month = (value: UserStatsMonth, withYear = true) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			year: withYear ? "numeric" : undefined,
			timeZone: "UTC",
		}).format(new Date(Date.UTC(value.year, value.month - 1, 1)));
	switch (period.type) {
		case "life":
			return "All time";
		case "none":
			return "All books";
		case "year":
			return String(period.year);
		case "month":
			return new Intl.DateTimeFormat("en-US", {
				month: "long",
				year: "numeric",
				timeZone: "UTC",
			}).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
		case "custom":
			return `${month(period.start)} – ${month(period.end)}`;
	}
}

/** A change against the period before. Null percent means there was nothing before to compare to. */
export function changeBetween(
	current: number,
	previous: number | null,
): {
	percent: number | null;
	direction: "up" | "down" | "same";
} | null {
	if (previous == null) return null;
	if (current === previous) return { percent: 0, direction: "same" };
	const direction = current > previous ? "up" : "down";
	if (previous === 0) return { percent: null, direction };
	return {
		percent: Math.round(((current - previous) / previous) * 100),
		direction,
	};
}

/** First and last day of a month range as `YYYY-MM-DD`, for the reading-activity filters. */
export function dayRangeOfBounds(bounds: UserStatsPeriodBounds): {
	from: string;
	to: string;
} {
	const pad = (value: number) => String(value).padStart(2, "0");
	const lastDay = new Date(
		Date.UTC(bounds.end.year, bounds.end.month, 0),
	).getUTCDate();
	return {
		from: `${bounds.start.year}-${pad(bounds.start.month)}-01`,
		to: `${bounds.end.year}-${pad(bounds.end.month)}-${pad(lastDay)}`,
	};
}

/** Reads that finished in the bounds, as `createdAt` bounds for rows without a finish month (reviews). */
export function createdAtRangeOfBounds(bounds: UserStatsPeriodBounds): {
	gte: Date;
	lt: Date;
} {
	const endMonth = bounds.end.month === 12 ? 1 : bounds.end.month + 1;
	const endYear =
		bounds.end.month === 12 ? bounds.end.year + 1 : bounds.end.year;
	return {
		gte: new Date(Date.UTC(bounds.start.year, bounds.start.month - 1, 1)),
		lt: new Date(Date.UTC(endYear, endMonth - 1, 1)),
	};
}

/**
 * How many dated reads each member has in the period: the numbers a rank is worked out
 * over. Everyone is counted, private members included; only a position is ever shown.
 */
export async function loadReadCountsByMember(
	db: Database,
	period: UserStatsPeriod,
	bounds: UserStatsPeriodBounds,
): Promise<number[]> {
	const where: Prisma.ReadWhereInput = {
		readEndYear: { not: null },
		readEndMonth: { not: null },
		...(period.type === "life"
			? {}
			: {
					AND: [
						{
							OR: [
								{ readEndYear: { gt: bounds.start.year } },
								{
									readEndYear: bounds.start.year,
									readEndMonth: { gte: bounds.start.month },
								},
							],
						},
						{
							OR: [
								{ readEndYear: { lt: bounds.end.year } },
								{
									readEndYear: bounds.end.year,
									readEndMonth: { lte: bounds.end.month },
								},
							],
						},
					],
				}),
	};
	const groups = await db.read.groupBy({
		by: ["userId"],
		where,
		_count: { _all: true },
	});
	return groups.map((group) => group._count._all);
}
