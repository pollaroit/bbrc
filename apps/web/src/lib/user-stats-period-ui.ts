import type { UserStatsPeriodType } from "@/lib/user-stats-search-params";

export const USER_STATS_PERIOD_TYPE_LABELS: Record<
	UserStatsPeriodType,
	string
> = {
	life: "All time",
	year: "Year",
	month: "Month",
	custom: "Custom range",
};

const MONTH_LABELS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

export function formatStatsMonthLabel(month: number): string {
	return MONTH_LABELS[month - 1] ?? String(month);
}

export function buildYearOptions(startYear = 2015): number[] {
	const current = new Date().getFullYear();
	const years: number[] = [];
	for (let year = current; year >= startYear; year -= 1) {
		years.push(year);
	}
	return years;
}

export function currentYearMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatYearMonth(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseYearMonth(value: string | null | undefined): {
	year: number;
	month: number;
} | null {
	if (!value?.trim()) return null;
	const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	if (month < 1 || month > 12) return null;
	return { year, month };
}

export function isUserStatsQueryReady(params: {
	period_type: UserStatsPeriodType;
	period: string | null;
	period_start: string | null;
	period_end: string | null;
}): boolean {
	if (params.period_type === "life") return true;
	if (params.period_type === "year") {
		return /^\d{4}$/.test(params.period?.trim() ?? "");
	}
	if (params.period_type === "month") {
		return parseYearMonth(params.period) != null;
	}
	if (params.period_type === "custom") {
		const start = parseYearMonth(params.period_start);
		const end = parseYearMonth(params.period_end);
		if (!start || !end) return false;
		return start.year * 12 + start.month <= end.year * 12 + end.month;
	}
	return false;
}
