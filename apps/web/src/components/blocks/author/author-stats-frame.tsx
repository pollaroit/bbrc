"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

export const MONTH_NAMES_SHORT = MONTH_SHORT;

/** "2024-03" -> "Mar ’24" */
export function formatMonthKey(month: string) {
	const [year, number] = month.split("-");
	const index = Number(number) - 1;
	if (!year || Number.isNaN(index) || !MONTH_SHORT[index]) return month;
	return `${MONTH_SHORT[index]} ’${year.slice(2)}`;
}

/** "2024-03" -> first and last day of that month as day keys. */
export function monthKeyToRange(month: string) {
	const [year, number] = month.split("-").map(Number);
	if (!year || !number) return null;
	const pad = (value: number) => String(value).padStart(2, "0");
	const last = new Date(year, number, 0).getDate();
	return {
		from: `${year}-${pad(number)}-01`,
		to: `${year}-${pad(number)}-${pad(last)}`,
	};
}

export function yearToRange(year: number) {
	return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function formatNumber(value: number, digits = 0) {
	return value.toLocaleString(undefined, {
		maximumFractionDigits: digits,
		minimumFractionDigits: 0,
	});
}

export function truncate(text: string, max: number) {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type StatsTable = {
	columns: string[];
	rows: (string | number)[][];
};

/**
 * A titled box around one chart: a heading that says what it shows, optional controls on the
 * right, the chart itself, and the same numbers as a table for anyone who cannot use the chart.
 */
export function ChartFrame({
	title,
	description,
	actions,
	table,
	className,
	children,
	footer,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
	table?: StatsTable;
	className?: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<section
			aria-label={title}
			className={cn(
				"flex min-w-0 flex-col gap-3 border border-border bg-card p-4",
				className,
			)}
		>
			<header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
				<div className="min-w-0">
					<h3 className="font-medium text-sm">{title}</h3>
					{description ? (
						<p className="text-muted-foreground text-xs">{description}</p>
					) : null}
				</div>
				{actions}
			</header>
			{children}
			{footer}
			{table && table.rows.length > 0 ? (
				<details className="group text-xs">
					<summary className="w-fit cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
						View as table
					</summary>
					<div className="mt-2 max-h-56 overflow-auto border border-border">
						<table className="w-full text-left tabular-nums">
							<thead className="sticky top-0 bg-muted">
								<tr>
									{table.columns.map((column) => (
										<th key={column} className="px-2 py-1 font-medium">
											{column}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{table.rows.map((row, index) => (
									<tr key={index} className="border-border border-t">
										{row.map((cell, cellIndex) => (
											<td key={cellIndex} className="px-2 py-1">
												{cell}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</details>
			) : null}
		</section>
	);
}

/** Shown in a chart's place when the filters leave nothing to draw. */
export function ChartEmpty({
	children = "Nothing to show for these filters.",
	className,
}: {
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex min-h-40 items-center justify-center border border-border border-dashed px-4 text-center text-muted-foreground text-sm",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function StatsSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-hidden>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{Array.from({ length: 8 }, (_, index) => (
					<Skeleton key={index} className="h-28 w-full" />
				))}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index} className="h-80 w-full" />
				))}
			</div>
		</div>
	);
}

/** Legend whose entries switch a series on and off. */
export function SeriesLegend({
	series,
	hidden,
	onToggle,
}: {
	series: { key: string; label: string; color: string }[];
	hidden: ReadonlySet<string>;
	onToggle: (key: string) => void;
}) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{series.map((item) => {
				const off = hidden.has(item.key);
				return (
					<li key={item.key}>
						<button
							type="button"
							aria-pressed={!off}
							onClick={() => onToggle(item.key)}
							className={cn(
								"inline-flex h-7 items-center gap-1.5 border border-border px-2 text-xs transition-colors hover:bg-muted",
								off && "text-muted-foreground line-through",
							)}
						>
							<span
								aria-hidden
								className="size-2.5"
								style={{
									backgroundColor: off ? "transparent" : item.color,
									border: `1.5px solid ${item.color}`,
								}}
							/>
							{item.label}
						</button>
					</li>
				);
			})}
		</ul>
	);
}
