import { VIEW_WEEKDAY_LABELS } from "@bbrc/shared";
import { clubTimeZone } from "@/lib/club-timezone";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { HeatmapGrid } from "./heatmap-grid";
import { formatCount, hourLabel } from "./insight-format";
import { InsightPanel } from "./insight-panel";

type Slot = { weekday: number; hour: number; views: number };

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
	const f = useFormatters();
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
					<HeatmapGrid grid={grid} />
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
											{formatCount(f, slot.views)}{" "}
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
