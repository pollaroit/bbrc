import { VIEW_WEEKDAY_LABELS } from "@bbrc/shared";
import { clubTimeZone } from "@/lib/club-timezone";
import { formatCount, hourLabel } from "./insight-format";
import { InsightPanel } from "./insight-panel";

type Slot = { weekday: number; hour: number; views: number };

const HOUR_MARKS = [0, 6, 12, 18];

/**
 * Weekday by hour, in the club's time zone. Darker means more views. Each cell
 * carries its own count in a tooltip, and the best slots are written out below
 * so the picture is never the only way to read it.
 */
export function InsightHeatmap({
	grid,
	bestSlots,
}: {
	grid: number[][];
	bestSlots: Slot[];
}) {
	const max = Math.max(1, ...grid.flat());
	const total = grid.flat().reduce((sum, value) => sum + value, 0);

	return (
		<InsightPanel
			title="When people look"
			description={`Views by weekday and hour over the last 90 days, in club time (${clubTimeZone}).`}
		>
			{total === 0 ? (
				<p className="text-muted-foreground text-sm">
					No views in this window yet.
				</p>
			) : (
				<>
					<div
						className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-px"
						aria-hidden
					>
						{grid.map((line, weekday) => (
							<div key={VIEW_WEEKDAY_LABELS[weekday]} className="contents">
								<span className="flex items-center text-2xs text-muted-foreground">
									{VIEW_WEEKDAY_LABELS[weekday]}
								</span>
								{line.map((views, hour) => (
									<span
										// biome-ignore lint/suspicious/noArrayIndexKey: fixed 24-hour grid
										key={hour}
										title={`${VIEW_WEEKDAY_LABELS[weekday]} ${hourLabel(hour)}: ${formatCount(views)} ${views === 1 ? "view" : "views"}`}
										className={
											views === 0
												? "h-4 bg-muted/50 sm:h-5"
												: "h-4 bg-primary sm:h-5"
										}
										style={
											views === 0
												? undefined
												: { opacity: 0.18 + 0.82 * (views / max) }
										}
									/>
								))}
							</div>
						))}
						<span />
						{Array.from({ length: 24 }, (_, hour) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed 24-hour grid
								key={hour}
								className="text-center text-3xs text-muted-foreground"
							>
								{HOUR_MARKS.includes(hour) ? hourLabel(hour) : ""}
							</span>
						))}
					</div>
					{bestSlots.length > 0 ? (
						<div className="flex flex-col gap-1.5 border-border border-t pt-3">
							<p className="font-medium text-sm">Best time to post</p>
							<ul className="flex flex-wrap gap-2">
								{bestSlots.map((slot, index) => (
									<li
										key={`${slot.weekday}-${slot.hour}`}
										className="flex items-baseline gap-1.5 border border-border px-2.5 py-1 text-sm"
									>
										<span className="font-medium">
											{VIEW_WEEKDAY_LABELS[slot.weekday]} {hourLabel(slot.hour)}
										</span>
										<span className="text-muted-foreground text-xs tabular-nums">
											{formatCount(slot.views)}{" "}
											{slot.views === 1 ? "view" : "views"}
											{index === 0 ? " · busiest" : ""}
										</span>
									</li>
								))}
							</ul>
							<p className="text-muted-foreground text-xs">
								Views peak at these times, so sharing then reaches the most
								people.
							</p>
						</div>
					) : null}
				</>
			)}
		</InsightPanel>
	);
}
