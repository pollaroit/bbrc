import { VIEW_WEEKDAY_LABELS } from "@bbrc/shared";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { formatCount, hourLabel } from "./insight-format";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** On a phone only these hours are named; from `sm` up every hour is. */
const isPhoneMark = (hour: number) => hour % 3 === 0 || hour === 23;

/**
 * Weekday by hour (all 24 hours, 00 to 23) in the club's time zone. Darker
 * means more views, and every cell carries its own count in a tooltip.
 * Shared by the item insights and the admin pages.
 */
export function HeatmapGrid({
	grid,
	className,
}: {
	/** Seven rows (Monday first) of 24 hourly counts. */
	grid: number[][];
	className?: string;
}) {
	const f = useFormatters();
	const max = Math.max(1, ...grid.flat());

	return (
		<div className={cn("overflow-x-auto", className)}>
			<div
				className="grid min-w-[22rem] grid-cols-[2rem_repeat(24,minmax(0,1fr))] gap-px"
				role="img"
				aria-label="Views by weekday and hour, hours 00 to 23"
			>
				{grid.map((line, weekday) => (
					<div key={VIEW_WEEKDAY_LABELS[weekday]} className="contents">
						<span className="flex items-center text-2xs text-muted-foreground">
							{VIEW_WEEKDAY_LABELS[weekday]}
						</span>
						{HOURS.map((hour) => {
							const views = line[hour] ?? 0;
							return (
								<span
									key={hour}
									title={`${VIEW_WEEKDAY_LABELS[weekday]} ${hourLabel(hour)}: ${formatCount(f, views)} ${views === 1 ? "view" : "views"}`}
									className={cn(
										"h-4 sm:h-5",
										views === 0 ? "bg-muted/50" : "bg-primary",
									)}
									style={
										views === 0
											? undefined
											: { opacity: 0.18 + 0.82 * (views / max) }
									}
								/>
							);
						})}
					</div>
				))}
				<span />
				{HOURS.map((hour) => (
					<span
						key={hour}
						className={cn(
							"text-center text-3xs text-muted-foreground tabular-nums",
							!isPhoneMark(hour) && "max-sm:invisible",
						)}
					>
						{String(hour).padStart(2, "0")}
					</span>
				))}
			</div>
		</div>
	);
}
