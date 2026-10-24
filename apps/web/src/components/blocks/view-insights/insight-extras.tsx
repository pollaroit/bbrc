import type { ViewInsights } from "@bbrc/api/modules/view/view.schema";
import { VIEW_WEEKDAY_LABELS } from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { cn } from "@/lib/utils";
import { formatCount, RESOURCE_NOUN, shortDay } from "./insight-format";
import { InsightPanel } from "./insight-panel";

const PLURAL: Record<ViewInsights["resource"], string> = {
	book: "books",
	post: "posts",
	shelf: "shelves",
	review: "reviews",
	user: "profiles",
};

/** The best day of the period, by opens (or by list views when nothing was opened). */
export function peakDayOf(series: ViewInsights["series"]) {
	let best: { day: string; value: number; label: "opens" | "views" } | null =
		null;
	for (const point of series) {
		if (point.opens > (best?.value ?? 0)) {
			best = { day: point.day, value: point.opens, label: "opens" };
		}
	}
	if (best) return best;
	for (const point of series) {
		if (point.impressions > (best?.value ?? 0)) {
			best = { day: point.day, value: point.impressions, label: "views" };
		}
	}
	return best;
}

function Fact({
	label,
	value,
	note,
}: {
	label: string;
	value: string;
	note?: string;
}) {
	return (
		<li className="flex min-w-0 flex-col gap-1 px-3 py-3">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-heading font-semibold text-lg leading-tight tracking-tight">
				{value}
			</span>
			{note ? (
				<span className="text-muted-foreground text-xs leading-snug">
					{note}
				</span>
			) : null}
		</li>
	);
}

/** Up to three one-line facts for the Overview: reach, best day, and how it stacks up. */
export function InsightHighlights({ insights }: { insights: ViewInsights }) {
	const noun = RESOURCE_NOUN[insights.resource];
	const peak = peakDayOf(insights.series);
	const { reach, comparison, mentions } = insights;
	const third = comparison
		? {
				label: "Next to the club",
				value:
					comparison.ratio != null &&
					(comparison.ratio >= 1.05 || comparison.ratio <= 0.95)
						? `${comparison.ratio}× the average`
						: "About the average",
				note: `#${comparison.rank} of ${formatCount(comparison.outOf)} ${PLURAL[insights.resource]} by opens`,
			}
		: mentions.total > 0
			? {
					label: "Shared",
					value: `In ${formatCount(mentions.total)} ${mentions.total === 1 ? "post" : "posts"}`,
					note: "Quoted or attached by members",
				}
			: null;

	return (
		<ul className="grid divide-y divide-border border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
			<Fact
				label="Reach"
				value={`${formatCount(reach.viewers)} of ${formatCount(reach.members)} members`}
				note={`have seen this ${noun}`}
			/>
			{peak ? (
				<Fact
					label="Best day"
					value={shortDay(peak.day)}
					note={`${formatCount(peak.value)} ${peak.label === "opens" ? (peak.value === 1 ? "open" : "opens") : peak.value === 1 ? "view in lists" : "views in lists"}`}
				/>
			) : null}
			{third ? (
				<Fact label={third.label} value={third.value} note={third.note} />
			) : null}
		</ul>
	);
}

/** How many separate visits each viewer made. */
export function InsightLoyalty({
	loyalty,
}: {
	loyalty: ViewInsights["loyalty"];
}) {
	const rows = [
		{ label: "Visited once", value: loyalty.once },
		{ label: "Visited twice", value: loyalty.twice },
		{ label: "3 to 5 visits", value: loyalty.threeToFive },
		{ label: "6 visits or more", value: loyalty.sixOrMore },
	];
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	if (total === 0) return null;
	const max = Math.max(1, ...rows.map((row) => row.value));
	const repeat = loyalty.twice + loyalty.threeToFive + loyalty.sixOrMore;
	return (
		<InsightPanel
			title="How often people come back"
			description="Viewers who opened it, by how many separate visits they made (at least 30 minutes apart)."
		>
			<ul className="flex flex-col gap-2.5">
				{rows.map((row) => (
					<li key={row.label} className="flex flex-col gap-1">
						<div className="flex items-baseline justify-between gap-3 text-sm">
							<span>{row.label}</span>
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{formatCount(row.value)} ·{" "}
								{Math.round((row.value / total) * 100)}%
							</span>
						</div>
						<span className="block h-1.5 w-full bg-muted" aria-hidden>
							<span
								className="block h-full bg-primary"
								style={{ width: `${(row.value / max) * 100}%` }}
							/>
						</span>
					</li>
				))}
			</ul>
			<p className="text-muted-foreground text-xs">
				{formatCount(repeat)} of {formatCount(total)}{" "}
				{total === 1 ? "viewer" : "viewers"} came back at least once.
			</p>
		</InsightPanel>
	);
}

/** Members who looked, against everyone in the club. */
export function InsightReach({
	reach,
	resource,
}: {
	reach: ViewInsights["reach"];
	resource: ViewInsights["resource"];
}) {
	if (reach.members === 0) return null;
	const share = Math.min(
		100,
		Math.round((reach.viewers / reach.members) * 100),
	);
	return (
		<InsightPanel
			title="Reach in the club"
			description="Signed-in members who have looked at it, in this period."
		>
			<p className="font-heading font-semibold text-xl tracking-tight">
				{formatCount(reach.viewers)} of {formatCount(reach.members)} members
				<span className="font-normal text-muted-foreground text-sm">
					{" "}
					have seen this {RESOURCE_NOUN[resource]}
				</span>
			</p>
			<span
				className="flex h-2 w-full overflow-hidden bg-muted"
				role="img"
				aria-label={`${share}% of members`}
			>
				<span className="bg-primary" style={{ width: `${share}%` }} />
			</span>
			<p className="text-muted-foreground text-xs tabular-nums">
				{share}% of the club
			</p>
		</InsightPanel>
	);
}

/** Per place: glances in lists against opens. */
export function InsightSourceRates({
	rows,
}: {
	rows: ViewInsights["sourceFunnel"];
}) {
	const withLists = rows.filter((row) => row.impressions > 0);
	const openOnly = rows.filter((row) => row.impressions === 0 && row.opens > 0);
	if (withLists.length === 0 && openOnly.length === 0) return null;
	return (
		<InsightPanel
			title="Open rate by place"
			description="How often a glance in a list turned into an open. An open does not always follow a glance (people also arrive from links, notifications and bookmarks), so a rate can pass 100%."
		>
			{withLists.length > 0 ? (
				<ul className="flex flex-col gap-3">
					{withLists.map((row) => {
						const rate = Math.round((row.opens / row.impressions) * 100);
						return (
							<li key={row.key} className="flex flex-col gap-1">
								<div className="flex items-baseline justify-between gap-3 text-sm">
									<span className="min-w-0 truncate">{row.label}</span>
									<span className="shrink-0 font-medium tabular-nums">
										{rate > 100 ? "100%+" : `${rate}%`}
									</span>
								</div>
								<span className="block h-1.5 w-full bg-muted" aria-hidden>
									<span
										className="block h-full bg-primary"
										style={{ width: `${Math.min(100, rate)}%` }}
									/>
								</span>
								<span className="text-muted-foreground text-xs tabular-nums">
									Seen {formatCount(row.impressions)} · opened{" "}
									{formatCount(row.opens)}
								</span>
							</li>
						);
					})}
				</ul>
			) : null}
			{openOnly.length > 0 ? (
				<p className="border-border border-t pt-3 text-muted-foreground text-xs leading-relaxed">
					Opened without being seen in a list first:{" "}
					{openOnly
						.map((row) => `${row.label} ${formatCount(row.opens)}`)
						.join(" · ")}
					.
				</p>
			) : null}
		</InsightPanel>
	);
}

/** Views by day of the week, from the last 90 days of the heatmap. */
export function InsightWeekdays({ grid }: { grid: number[][] }) {
	const sums = grid.map((line) => line.reduce((sum, value) => sum + value, 0));
	const total = sums.reduce((sum, value) => sum + value, 0);
	if (total === 0) return null;
	const max = Math.max(1, ...sums);
	return (
		<InsightPanel
			title="Busiest days of the week"
			description="Views by weekday over the last 90 days, in club time."
		>
			<ul
				className="grid grid-cols-7 items-end gap-1.5"
				aria-label="Views by weekday"
			>
				{sums.map((value, weekday) => (
					<li
						key={VIEW_WEEKDAY_LABELS[weekday]}
						className="flex flex-col items-center gap-1.5"
						title={`${VIEW_WEEKDAY_LABELS[weekday]}: ${formatCount(value)} views`}
					>
						<span className="text-3xs text-muted-foreground tabular-nums">
							{formatCount(value)}
						</span>
						<span className="flex h-20 w-full items-end bg-muted/50">
							<span
								className={cn(
									"block w-full",
									value === max ? "bg-primary" : "bg-primary/45",
								)}
								style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
							/>
						</span>
						<span className="text-2xs text-muted-foreground">
							{VIEW_WEEKDAY_LABELS[weekday]}
						</span>
					</li>
				))}
			</ul>
		</InsightPanel>
	);
}

/** How fast it spread after it was published. */
export function InsightLifecycle({
	lifecycle,
	resource,
}: {
	lifecycle: NonNullable<ViewInsights["lifecycle"]>;
	resource: ViewInsights["resource"];
}) {
	const steps = [
		{ label: "First day", value: lifecycle.firstDay },
		{ label: "First 3 days", value: lifecycle.firstThreeDays },
		{ label: "First week", value: lifecycle.firstWeek },
		{ label: "So far", value: lifecycle.total },
	];
	const max = Math.max(1, lifecycle.total);
	const share =
		lifecycle.total > 0
			? Math.round((lifecycle.firstDay / lifecycle.total) * 100)
			: null;
	return (
		<InsightPanel
			title={`Life of this ${RESOURCE_NOUN[resource]}`}
			description={`Opens after it was published (${shortDay(new Date(lifecycle.publishedAt).toISOString().slice(0, 10))}), added up.`}
		>
			<ol className="flex flex-col gap-2.5">
				{steps.map((step, index) => (
					<li key={step.label} className="flex flex-col gap-1">
						<div className="flex items-baseline justify-between gap-3 text-sm">
							<span>{step.label}</span>
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{formatCount(step.value)}
							</span>
						</div>
						<span className="block h-1.5 w-full bg-muted" aria-hidden>
							<span
								className={cn(
									"block h-full",
									index === steps.length - 1 ? "bg-primary" : "bg-primary/60",
								)}
								style={{ width: `${(step.value / max) * 100}%` }}
							/>
						</span>
					</li>
				))}
			</ol>
			{share != null && lifecycle.firstDay > 0 ? (
				<p className="text-sm">
					Opened {formatCount(lifecycle.firstDay)}{" "}
					{lifecycle.firstDay === 1 ? "time" : "times"} in the first day,{" "}
					<span className="font-medium">{share}%</span> of everything this{" "}
					{RESOURCE_NOUN[resource]} has had.
				</p>
			) : null}
		</InsightPanel>
	);
}

/** Posts that quoted or attached the item. */
export function InsightMentions({
	mentions,
}: {
	mentions: ViewInsights["mentions"];
}) {
	if (mentions.total === 0) return null;
	return (
		<InsightPanel
			title="Shared by members"
			description="Posts that quoted or attached it."
		>
			<p className="font-heading font-semibold text-xl tracking-tight">
				Shared in {formatCount(mentions.total)}{" "}
				{mentions.total === 1 ? "post" : "posts"}
			</p>
			<ul className="flex flex-col gap-2">
				{mentions.recent.map((mention) => (
					<li
						key={`${mention.href}-${String(mention.at)}`}
						className="flex items-center justify-between gap-3 border border-border px-2 py-1.5 text-sm"
					>
						<Link
							href={mention.href as Route}
							className="min-w-0 truncate outline-offset-2 hover:underline"
						>
							{mention.name}{" "}
							<span className="text-muted-foreground">@{mention.username}</span>
						</Link>
						<RelativeTime
							date={mention.at}
							className="shrink-0 text-muted-foreground text-xs"
						/>
					</li>
				))}
			</ul>
		</InsightPanel>
	);
}

/** Against the author's other posts, reviews or shelves. */
export function InsightOwnComparison({
	own,
	resource,
	allTimeOpens,
}: {
	own: NonNullable<ViewInsights["ownComparison"]>;
	resource: ViewInsights["resource"];
	allTimeOpens: number;
}) {
	const noun = RESOURCE_NOUN[resource];
	return (
		<InsightPanel
			title={`Next to your other ${PLURAL[resource]}`}
			description="By opens, ever, not counting your own visits."
		>
			<p className="font-heading font-semibold text-xl tracking-tight">
				{own.rank === 1
					? `Your most opened ${noun}`
					: `#${own.rank} of your ${formatCount(own.outOf)} ${PLURAL[resource]}`}
			</p>
			<p className="text-muted-foreground text-sm tabular-nums">
				{formatCount(allTimeOpens)} opens here · your average is{" "}
				{formatCount(own.averageOpens)}
			</p>
		</InsightPanel>
	);
}
