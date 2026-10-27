import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import {
	type Delta,
	deltaOf,
	formatCompact,
	formatCount,
	type Totals,
} from "./insight-format";

function DeltaBadge({ delta, label }: { delta: Delta | null; label: string }) {
	if (!delta) return null;
	const Icon =
		delta.direction === "up"
			? ArrowUpRight
			: delta.direction === "down"
				? ArrowDownRight
				: Minus;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 text-xs tabular-nums",
				delta.direction === "up" && "text-success-ink",
				delta.direction === "down" && "text-destructive",
				delta.direction === "flat" && "text-muted-foreground",
			)}
			title={`Compared with ${label}`}
		>
			<Icon className="size-3.5" aria-hidden />
			{delta.fresh ? "New" : `${Math.abs(delta.percent ?? 0)}%`}
			<span className="sr-only"> compared with {label}</span>
		</span>
	);
}

function Stat({
	label,
	value,
	hint,
	delta,
	compareLabel,
	children,
}: {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	delta?: Delta | null;
	compareLabel: string;
	children?: ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5 px-3 py-3.5 sm:px-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="flex items-baseline gap-2">
				<span className="font-heading font-semibold text-2xl tabular-nums leading-none tracking-tight sm:text-3xl">
					{value}
				</span>
				<DeltaBadge delta={delta ?? null} label={compareLabel} />
			</span>
			{hint ? (
				<span className="text-muted-foreground text-xs leading-snug">
					{hint}
				</span>
			) : null}
			{children}
		</div>
	);
}

/** The four headline numbers, each with its change since the period before when known. */
export function InsightStatStrip({
	totals,
	previous,
	compareLabel,
}: {
	totals: Totals;
	previous: Totals | null;
	compareLabel: string;
}) {
	const f = useFormatters();
	const { memberViewers, guestViewers } = totals;
	const mix = memberViewers + guestViewers;
	return (
		<div className="grid grid-cols-2 divide-x divide-y divide-border border border-border bg-card lg:grid-cols-4 lg:divide-y-0">
			<Stat
				label="Opens"
				value={formatCompact(f, totals.opens)}
				hint="Times the page was opened"
				delta={deltaOf(totals.opens, previous?.opens ?? null)}
				compareLabel={compareLabel}
			/>
			<Stat
				label="Seen in lists"
				value={formatCompact(f, totals.impressions)}
				hint="Times it showed up in a list"
				delta={deltaOf(totals.impressions, previous?.impressions ?? null)}
				compareLabel={compareLabel}
			/>
			<Stat
				label="Open rate"
				value={
					totals.openRate == null ? "—" : `${formatCount(f, totals.openRate)}%`
				}
				hint={
					totals.openRate == null
						? "Needs a list view first"
						: "Opens for every 100 times seen"
				}
				delta={
					totals.openRate != null && previous?.openRate != null
						? deltaOf(totals.openRate, previous.openRate)
						: null
				}
				compareLabel={compareLabel}
			/>
			<Stat
				label="Viewers"
				value={formatCompact(f, totals.uniqueViewers)}
				hint={`${formatCount(f, memberViewers)} ${memberViewers === 1 ? "member" : "members"} · ${formatCount(f, guestViewers)} ${guestViewers === 1 ? "guest" : "guests"}`}
				delta={deltaOf(totals.uniqueViewers, previous?.uniqueViewers ?? null)}
				compareLabel={compareLabel}
			>
				{mix > 0 ? (
					<span
						className="mt-0.5 flex h-1.5 w-full overflow-hidden bg-muted"
						role="img"
						aria-label={`${Math.round((memberViewers / mix) * 100)}% members`}
					>
						<span
							className="bg-primary"
							style={{ width: `${(memberViewers / mix) * 100}%` }}
						/>
					</span>
				) : null}
			</Stat>
		</div>
	);
}
