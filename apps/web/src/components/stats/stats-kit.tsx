"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The small pieces every stats tab is built from, for a member's page and the club's.
 *
 * <StatsSection id title description? actions?>   a titled card; `id` is the anchor a
 *                                                  scoreboard tile jumps to
 * <StatRow items={[{ label, value, hint? }]} />   a few numbers in one line
 * <Sparkline values />                            a tiny line, no axes
 * <MiniBars bars />                               a few labelled bars
 * <ChangeChip change />                           "+12%" against the period before
 * <StatsEmpty>                                    one quiet line when there is nothing to show
 */

export function StatsSection({
	id,
	title,
	description,
	actions,
	children,
	className,
}: {
	id?: string;
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			id={id}
			aria-label={title}
			className={cn("scroll-mt-24 border border-border bg-card", className)}
		>
			<header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-border border-b px-4 py-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2 className="font-semibold text-sm tracking-tight">{title}</h2>
					{description ? (
						<p className="max-w-prose text-muted-foreground text-xs leading-relaxed">
							{description}
						</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex flex-wrap items-center gap-2">{actions}</div>
				) : null}
			</header>
			<div className="flex flex-col gap-4 p-4">{children}</div>
		</section>
	);
}

export function StatsEmpty({ children }: { children: ReactNode }) {
	return (
		<p className="py-6 text-center text-muted-foreground text-sm">{children}</p>
	);
}

export type StatRowItem = {
	label: string;
	value: string;
	hint?: string | null;
};

/** A handful of numbers on one line: big value, small label, optional hint. */
export function StatRow({ items }: { items: StatRowItem[] }) {
	return (
		<dl className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
			{items.map((item) => (
				<div
					key={item.label}
					className="flex flex-col gap-0.5 bg-card px-3 py-2.5"
				>
					<dt className="text-muted-foreground text-xs">{item.label}</dt>
					<dd className="font-semibold text-xl tabular-nums leading-none tracking-tight">
						{item.value}
					</dd>
					{item.hint ? (
						<span className="text-2xs text-muted-foreground">{item.hint}</span>
					) : null}
				</div>
			))}
		</dl>
	);
}

/** A line with no axes, drawn with the current text colour so it follows the theme. */
export function Sparkline({
	values,
	className,
}: {
	values: readonly number[];
	className?: string;
}) {
	if (values.length < 2) return null;
	const width = 100;
	const height = 28;
	const max = Math.max(...values, 1);
	const step = width / (values.length - 1);
	const points = values.map((value, index) => {
		const x = index * step;
		const y = height - 2 - (value / max) * (height - 4);
		return `${x.toFixed(2)},${y.toFixed(2)}`;
	});
	const area = `0,${height} ${points.join(" ")} ${width},${height}`;
	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			className={cn("h-7 w-full text-primary", className)}
			aria-hidden
		>
			<polygon points={area} fill="currentColor" opacity={0.12} />
			<polyline
				points={points.join(" ")}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** A few bars side by side, tallest at full height; each has its label as a tooltip. */
export function MiniBars({
	bars,
	className,
}: {
	bars: readonly { label: string; value: number }[];
	className?: string;
}) {
	const max = Math.max(...bars.map((bar) => bar.value), 1);
	return (
		<ul className={cn("flex h-7 items-end gap-1", className)} aria-hidden>
			{bars.map((bar) => (
				<li
					key={bar.label}
					title={`${bar.label}: ${bar.value}`}
					className="flex-1 bg-primary/70"
					style={{ height: `${Math.max(8, (bar.value / max) * 100)}%` }}
				/>
			))}
		</ul>
	);
}

/** "+12%" or "−5%" against the period before, in the success or warning colour. */
export function ChangeChip({
	change,
	className,
}: {
	change: {
		percent: number | null;
		direction: "up" | "down" | "same";
	} | null;
	className?: string;
}) {
	if (!change) return null;
	const Icon =
		change.direction === "up"
			? ArrowUpRight
			: change.direction === "down"
				? ArrowDownRight
				: ArrowRight;
	const tone =
		change.direction === "up"
			? "text-success-ink"
			: change.direction === "down"
				? "text-warning-ink"
				: "text-muted-foreground";
	const text =
		change.percent == null
			? "new"
			: change.direction === "same"
				? "no change"
				: `${change.percent > 0 ? "+" : "−"}${Math.abs(change.percent)}%`;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 font-medium text-2xs tabular-nums",
				tone,
				className,
			)}
			title="Compared with the period before"
		>
			<Icon className="size-3" aria-hidden />
			{text}
		</span>
	);
}
