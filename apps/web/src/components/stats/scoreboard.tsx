"use client";

import type { ScoreboardTile } from "@bbrc/api/modules/member-stats/member-stats.schema";
import { cn } from "@/lib/utils";
import { ChangeChip, MiniBars, Sparkline } from "./stats-kit";

/** Scrolls to a section once its tab has mounted and loaded; gives up after about two seconds. */
export function scrollToStatsSection(id: string) {
	let tries = 0;
	const look = () => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
		tries += 1;
		if (tries < 20) window.setTimeout(look, 100);
	};
	look();
}

/**
 * The headline numbers as one joined strip, not separate cards. Each has its change
 * against the period before and a tiny chart; pressing it jumps to its section.
 */
export function Scoreboard({
	tiles,
	onOpen,
	className,
	you,
}: {
	tiles: readonly ScoreboardTile[];
	onOpen: (to: ScoreboardTile["to"]) => void;
	className?: string;
	/** The signed-in member's own number for a tile, shown beside the club's ("You: 31"). */
	you?: Readonly<Record<string, string>>;
}) {
	if (tiles.length === 0) return null;
	return (
		<ul
			className={cn(
				"grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]",
				className,
			)}
		>
			{tiles.map((tile) => (
				<li key={tile.id} className="bg-card">
					<button
						type="button"
						onClick={() => onOpen(tile.to)}
						className="group flex h-full w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
					>
						<span className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
							{tile.label}
							<ChangeChip change={tile.change} />
						</span>
						<span className="flex items-baseline gap-1.5">
							<span className="truncate font-bold text-2xl tabular-nums leading-tight tracking-tight">
								{tile.value}
							</span>
							{tile.unit ? (
								<span className="text-muted-foreground text-xs">
									{tile.unit}
								</span>
							) : null}
						</span>
						<span className="min-h-4 text-2xs text-muted-foreground">
							{tile.note ?? " "}
						</span>
						<span className="mt-1 block opacity-80 transition-opacity group-hover:opacity-100">
							{tile.spark ? <Sparkline values={tile.spark} /> : null}
							{tile.bars ? <MiniBars bars={tile.bars} /> : null}
						</span>
					</button>
				</li>
			))}
		</ul>
	);
}
