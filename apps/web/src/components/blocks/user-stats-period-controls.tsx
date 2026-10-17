"use client";

import { Label } from "@bbrc/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { cn } from "@bbrc/ui/lib/utils";
import { useMemo } from "react";
import {
	buildYearOptions,
	currentYearMonth,
	formatStatsMonthLabel,
	formatYearMonth,
	parseYearMonth,
	USER_STATS_PERIOD_TYPE_LABELS,
} from "@/lib/user-stats-period-ui";
import type { useUserStatsSearchParams } from "@/lib/user-stats-search-params";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);
const MONTH_YEAR_GRID =
	"grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_5.5rem]";

function PeriodField({
	label,
	children,
	className,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
			<Label className="font-normal text-muted-foreground text-xs">
				{label}
			</Label>
			{children}
		</div>
	);
}

export function UserStatsPeriodControls({
	params,
	setParams,
	firstDatedReadYear,
}: {
	params: ReturnType<typeof useUserStatsSearchParams>[0];
	setParams: ReturnType<typeof useUserStatsSearchParams>[1];
	firstDatedReadYear: number | null;
}) {
	const { year: currentYear, month: currentMonth } = currentYearMonth();
	const yearOptions = useMemo(
		() => buildYearOptions(firstDatedReadYear ?? currentYear),
		[firstDatedReadYear, currentYear],
	);
	const monthParsed = parseYearMonth(params.period);
	const monthYear = monthParsed?.year ?? currentYear;
	const monthValue = monthParsed?.month ?? currentMonth;
	const startParsed = parseYearMonth(params.period_start);
	const endParsed = parseYearMonth(params.period_end);
	const customStartYear = startParsed?.year ?? currentYear;
	const customStartMonth = startParsed?.month ?? currentMonth;
	const customEndYear = endParsed?.year ?? currentYear;
	const customEndMonth = endParsed?.month ?? currentMonth;

	const selectedYear =
		params.period_type === "year" && params.period?.trim()
			? params.period.trim()
			: String(currentYear);

	const onPeriodTypeChange = (value: string | null) => {
		if (!value) return;
		const type = value as typeof params.period_type;
		const ym = formatYearMonth(currentYear, currentMonth);
		if (type === "life" || type === "none") {
			void setParams({
				period_type: type,
				period: null,
				period_start: null,
				period_end: null,
			});
			return;
		}
		if (type === "year") {
			void setParams({
				period_type: type,
				period: String(currentYear),
				period_start: null,
				period_end: null,
			});
			return;
		}
		if (type === "month") {
			void setParams({
				period_type: type,
				period: ym,
				period_start: null,
				period_end: null,
			});
			return;
		}
		void setParams({
			period_type: type,
			period: null,
			period_start: ym,
			period_end: ym,
		});
	};

	return (
		<div className="w-full border border-border bg-background p-3 sm:max-w-sm">
			<div className="flex flex-col gap-3">
				<PeriodField label="Period">
					<Select value={params.period_type} onValueChange={onPeriodTypeChange}>
						<SelectTrigger className="w-full" aria-label="Stats period">
							<span>{USER_STATS_PERIOD_TYPE_LABELS[params.period_type]}</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="life">All time</SelectItem>
							<SelectItem value="none">All books</SelectItem>
							<SelectItem value="year">Year</SelectItem>
							<SelectItem value="month">Month</SelectItem>
							<SelectItem value="custom">Custom range</SelectItem>
						</SelectContent>
					</Select>
				</PeriodField>

				{params.period_type === "year" ? (
					<PeriodField label="Year">
						<Select
							value={selectedYear}
							onValueChange={(value) => void setParams({ period: value })}
						>
							<SelectTrigger className="w-full" aria-label="Year">
								<span>{selectedYear}</span>
							</SelectTrigger>
							<SelectContent>
								{yearOptions.map((year) => (
									<SelectItem key={year} value={String(year)}>
										{year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</PeriodField>
				) : null}

				{params.period_type === "month" ? (
					<div className={MONTH_YEAR_GRID}>
						<PeriodField label="Month">
							<Select
								value={String(monthValue)}
								onValueChange={(value) =>
									void setParams({
										period: formatYearMonth(monthYear, Number(value)),
									})
								}
							>
								<SelectTrigger className="w-full" aria-label="Month">
									<span>{formatStatsMonthLabel(monthValue)}</span>
								</SelectTrigger>
								<SelectContent>
									{MONTH_NUMBERS.map((month) => (
										<SelectItem key={month} value={String(month)}>
											{formatStatsMonthLabel(month)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</PeriodField>
						<PeriodField label="Year">
							<Select
								value={String(monthYear)}
								onValueChange={(value) =>
									void setParams({
										period: formatYearMonth(Number(value), monthValue),
									})
								}
							>
								<SelectTrigger className="w-full" aria-label="Month year">
									<span>{monthYear}</span>
								</SelectTrigger>
								<SelectContent>
									{yearOptions.map((year) => (
										<SelectItem key={year} value={String(year)}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</PeriodField>
					</div>
				) : null}

				{params.period_type === "custom" ? (
					<div className="flex flex-col gap-3 border-border border-t pt-3">
						<p className="font-medium text-sm">From</p>
						<div className={MONTH_YEAR_GRID}>
							<PeriodField label="Month">
								<Select
									value={String(customStartMonth)}
									onValueChange={(value) =>
										void setParams({
											period_start: formatYearMonth(
												customStartYear,
												Number(value),
											),
										})
									}
								>
									<SelectTrigger
										className="w-full"
										aria-label="Range start month"
									>
										<span>{formatStatsMonthLabel(customStartMonth)}</span>
									</SelectTrigger>
									<SelectContent>
										{MONTH_NUMBERS.map((month) => (
											<SelectItem key={month} value={String(month)}>
												{formatStatsMonthLabel(month)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</PeriodField>
							<PeriodField label="Year">
								<Select
									value={String(customStartYear)}
									onValueChange={(value) =>
										void setParams({
											period_start: formatYearMonth(
												Number(value),
												customStartMonth,
											),
										})
									}
								>
									<SelectTrigger
										className="w-full"
										aria-label="Range start year"
									>
										<span>{customStartYear}</span>
									</SelectTrigger>
									<SelectContent>
										{yearOptions.map((year) => (
											<SelectItem key={year} value={String(year)}>
												{year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</PeriodField>
						</div>
						<p className="font-medium text-sm">To</p>
						<div className={MONTH_YEAR_GRID}>
							<PeriodField label="Month">
								<Select
									value={String(customEndMonth)}
									onValueChange={(value) =>
										void setParams({
											period_end: formatYearMonth(customEndYear, Number(value)),
										})
									}
								>
									<SelectTrigger
										className="w-full"
										aria-label="Range end month"
									>
										<span>{formatStatsMonthLabel(customEndMonth)}</span>
									</SelectTrigger>
									<SelectContent>
										{MONTH_NUMBERS.map((month) => (
											<SelectItem key={month} value={String(month)}>
												{formatStatsMonthLabel(month)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</PeriodField>
							<PeriodField label="Year">
								<Select
									value={String(customEndYear)}
									onValueChange={(value) =>
										void setParams({
											period_end: formatYearMonth(
												Number(value),
												customEndMonth,
											),
										})
									}
								>
									<SelectTrigger className="w-full" aria-label="Range end year">
										<span>{customEndYear}</span>
									</SelectTrigger>
									<SelectContent>
										{yearOptions.map((year) => (
											<SelectItem key={year} value={String(year)}>
												{year}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</PeriodField>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
