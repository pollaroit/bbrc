import type { ViewInsights } from "@bbrc/api/modules/view/view.schema";
import { Heart, MessageSquare, Repeat2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount, RANGE_PHRASE, RESOURCE_NOUN } from "./insight-format";
import { InsightPanel } from "./insight-panel";

/** New vs returning, members and guests, as two stacked bars. */
export function InsightAudience({
	audience,
}: {
	audience: ViewInsights["audience"];
}) {
	const groups = [
		{
			label: "Members",
			fresh: audience.newMembers,
			back: audience.returningMembers,
		},
		{
			label: "Guests",
			fresh: audience.newGuests,
			back: audience.returningGuests,
		},
	];
	const any = groups.some((group) => group.fresh + group.back > 0);
	return (
		<InsightPanel
			title="New and returning"
			description="Whether people who opened it had been here before. Guests are counted over the last 90 days only."
		>
			{any ? (
				<div className="flex flex-col gap-4">
					{groups.map((group) => {
						const total = group.fresh + group.back;
						return (
							<div key={group.label} className="flex flex-col gap-1.5">
								<div className="flex items-baseline justify-between text-sm">
									<span>{group.label}</span>
									<span className="text-muted-foreground text-xs tabular-nums">
										{formatCount(group.fresh)} new · {formatCount(group.back)}{" "}
										returning
									</span>
								</div>
								<span
									className="flex h-2 w-full overflow-hidden bg-muted"
									role="img"
									aria-label={`${group.label}: ${group.fresh} new, ${group.back} returning`}
								>
									{total > 0 ? (
										<>
											<span
												className="bg-primary"
												style={{ width: `${(group.fresh / total) * 100}%` }}
											/>
											<span
												className="bg-primary/35"
												style={{ width: `${(group.back / total) * 100}%` }}
											/>
										</>
									) : null}
								</span>
							</div>
						);
					})}
					<p className="flex items-center gap-4 text-muted-foreground text-xs">
						<span className="inline-flex items-center gap-1.5">
							<span className="size-2 bg-primary" aria-hidden /> New
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span className="size-2 bg-primary/35" aria-hidden /> Returning
						</span>
					</p>
				</div>
			) : (
				<p className="text-muted-foreground text-sm">
					Nobody has opened it in this period.
				</p>
			)}
		</InsightPanel>
	);
}

/** How this item does next to the average of its kind. */
export function InsightComparison({
	comparison,
	resource,
}: {
	comparison: NonNullable<ViewInsights["comparison"]>;
	resource: ViewInsights["resource"];
}) {
	const noun = RESOURCE_NOUN[resource];
	const ratio = comparison.ratio;
	const phrase =
		ratio == null
			? `Average ${noun}: ${formatCount(comparison.averageOpens)} opens`
			: ratio >= 1.05
				? `${ratio}× the average ${noun}`
				: ratio <= 0.95
					? `${ratio}× the average ${noun}`
					: `About the average ${noun}`;
	return (
		<InsightPanel
			title="Next to the club"
			description={`Compared with other ${noun === "profile" ? "profiles" : `${noun}s`} that were opened in ${RANGE_PHRASE[comparison.days >= 90 ? "90d" : comparison.days >= 30 ? "30d" : "7d"]}.`}
		>
			<div className="flex flex-col gap-1">
				<p className="flex items-center gap-2 font-heading font-semibold text-xl tracking-tight">
					<TrendingUp className="size-5 text-muted-foreground" aria-hidden />
					{phrase}
				</p>
				<p className="text-muted-foreground text-sm tabular-nums">
					#{comparison.rank} of {formatCount(comparison.outOf)} by opens ·
					average {formatCount(comparison.averageOpens)}
				</p>
			</div>
		</InsightPanel>
	);
}

/** Likes, comments and shares next to opens. */
export function InsightEngagement({
	engagement,
}: {
	engagement: NonNullable<ViewInsights["engagement"]>;
}) {
	const items = [
		{ label: "Likes", value: engagement.likes, Icon: Heart },
		{ label: "Comments", value: engagement.comments, Icon: MessageSquare },
		{ label: "Shares", value: engagement.shares, Icon: Repeat2 },
	];
	return (
		<InsightPanel
			title="What people did"
			description="Reactions in this period, next to how often it was opened."
		>
			<ul className="grid grid-cols-3 divide-x divide-border border border-border">
				{items.map(({ label, value, Icon }) => (
					<li key={label} className="flex flex-col gap-1 px-3 py-3">
						<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<Icon className="size-3.5" aria-hidden />
							{label}
						</span>
						<span className="font-heading font-semibold text-xl tabular-nums">
							{formatCount(value)}
						</span>
					</li>
				))}
			</ul>
			<p className="text-sm">
				{engagement.rate == null ? (
					<span className="text-muted-foreground">
						No opens yet, so there is no rate to show.
					</span>
				) : (
					<>
						<span className="font-medium tabular-nums">
							{formatCount(engagement.rate)}
						</span>{" "}
						<span className="text-muted-foreground">
							reactions for every 100 opens
						</span>
					</>
				)}
			</p>
		</InsightPanel>
	);
}

/** From people who opened the book to what they went on to do. */
export function InsightFunnel({
	funnel,
}: {
	funnel: NonNullable<ViewInsights["funnel"]>;
}) {
	const steps = [
		{
			label: "Opened the book",
			value: funnel.viewers,
			note: "Distinct viewers",
		},
		{
			label: "Put on a shelf",
			value: funnel.onShelves,
			note: "Shelf additions",
		},
		{ label: "Marked as read", value: funnel.reads, note: "Reads logged" },
		{
			label: "Added to favourites",
			value: funnel.favourites,
			note: "Favourites",
		},
		{ label: "Wrote a review", value: funnel.reviews, note: "Reviews" },
	];
	const top = Math.max(1, ...steps.map((step) => step.value));
	return (
		<InsightPanel
			title="From looking to reading"
			description="What members did with this book in the period. Actions can come from people who found it another way, so they are shown per 100 viewers rather than as a strict funnel."
		>
			<ol className="flex flex-col gap-3">
				{steps.map((step, index) => {
					const per100 =
						index === 0 || funnel.viewers === 0
							? null
							: Math.round((step.value / funnel.viewers) * 100);
					return (
						<li key={step.label} className="flex flex-col gap-1">
							<div className="flex items-baseline justify-between gap-3 text-sm">
								<span>{step.label}</span>
								<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
									{formatCount(step.value)}
									{per100 != null ? ` · ${per100} per 100 viewers` : ""}
								</span>
							</div>
							<span className="block h-2 w-full bg-muted" aria-hidden>
								<span
									className={cn(
										"block h-full",
										index === 0 ? "bg-primary" : "bg-primary/60",
									)}
									style={{ width: `${(step.value / top) * 100}%` }}
								/>
							</span>
						</li>
					);
				})}
			</ol>
		</InsightPanel>
	);
}
