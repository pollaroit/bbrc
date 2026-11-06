"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { useMemo } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import {
	buildYearOptions,
	currentYearMonth,
	formatStatsMonthLabel,
	formatYearMonth,
	parseYearMonth,
	USER_STATS_PERIOD_TYPE_LABELS,
} from "@/lib/user-stats-period-ui";
import {
	type UserStatsPeriodType,
	useUserStatsSearchParams,
} from "@/lib/user-stats-search-params";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function MonthYear({
	label,
	value,
	years,
	onChange,
}: {
	label: string;
	value: { year: number; month: number };
	years: number[];
	onChange: (value: { year: number; month: number }) => void;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-muted-foreground text-xs">{label}</span>
			<Select
				value={String(value.month)}
				onValueChange={(month) =>
					month && onChange({ ...value, month: Number(month) })
				}
			>
				<SelectTrigger size="sm" aria-label={`${label} month`}>
					<span>{formatStatsMonthLabel(value.month).slice(0, 3)}</span>
				</SelectTrigger>
				<SelectContent>
					{MONTHS.map((month) => (
						<SelectItem key={month} value={String(month)}>
							{formatStatsMonthLabel(month)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={String(value.year)}
				onValueChange={(year) =>
					year && onChange({ ...value, year: Number(year) })
				}
			>
				<SelectTrigger size="sm" aria-label={`${label} year`}>
					<span>{value.year}</span>
				</SelectTrigger>
				<SelectContent>
					{years.map((year) => (
						<SelectItem key={year} value={String(year)}>
							{year}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/**
 * The period of a stats page: one segmented control and, for a year, a month or a
 * range, the pickers it needs right next to it. Everything is kept in the address.
 * The club page passes fewer `types`.
 */
export function StatsPeriodBar({
	types = ["life", "none", "year", "month", "custom"],
	firstYear,
}: {
	types?: readonly UserStatsPeriodType[];
	firstYear: number | null;
}) {
	const [params, setParams] = useUserStatsSearchParams();
	const { year: nowYear, month: nowMonth } = currentYearMonth();
	const years = useMemo(
		() => buildYearOptions(firstYear ?? nowYear),
		[firstYear, nowYear],
	);

	const nowYm = formatYearMonth(nowYear, nowMonth);
	const choose = (type: UserStatsPeriodType) => {
		void setParams({
			period_type: type,
			period:
				type === "year" ? String(nowYear) : type === "month" ? nowYm : null,
			period_start: type === "custom" ? nowYm : null,
			period_end: type === "custom" ? nowYm : null,
		});
	};

	const month = parseYearMonth(params.period) ?? {
		year: nowYear,
		month: nowMonth,
	};
	const start = parseYearMonth(params.period_start) ?? month;
	const end = parseYearMonth(params.period_end) ?? month;
	const year = /^\d{4}$/.test(params.period?.trim() ?? "")
		? params.period!.trim()
		: String(nowYear);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<SegmentedControl
				label="Period"
				value={params.period_type}
				options={types.map((type) => ({
					id: type,
					label: USER_STATS_PERIOD_TYPE_LABELS[type],
				}))}
				onChange={choose}
			/>
			{params.period_type === "year" ? (
				<Select
					value={year}
					onValueChange={(value) => value && void setParams({ period: value })}
				>
					<SelectTrigger size="sm" aria-label="Year">
						<span>{year}</span>
					</SelectTrigger>
					<SelectContent>
						{years.map((value) => (
							<SelectItem key={value} value={String(value)}>
								{value}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : null}
			{params.period_type === "month" ? (
				<MonthYear
					label="Month"
					value={month}
					years={years}
					onChange={(next) =>
						void setParams({ period: formatYearMonth(next.year, next.month) })
					}
				/>
			) : null}
			{params.period_type === "custom" ? (
				<>
					<MonthYear
						label="From"
						value={start}
						years={years}
						onChange={(next) =>
							void setParams({
								period_start: formatYearMonth(next.year, next.month),
							})
						}
					/>
					<MonthYear
						label="to"
						value={end}
						years={years}
						onChange={(next) =>
							void setParams({
								period_end: formatYearMonth(next.year, next.month),
							})
						}
					/>
				</>
			) : null}
		</div>
	);
}
