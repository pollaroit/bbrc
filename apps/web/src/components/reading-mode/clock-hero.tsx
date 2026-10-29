"use client";

import type { TimerConfig } from "@bbrc/shared";
import { formatClock, formatDuration, type TimerReading } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import type { TimerNotice } from "@/lib/reading-mode/use-reading-session";
import { cn } from "@/lib/utils";

const TICKS = 60;
const RULER = Array.from({ length: TICKS }, (_, tick) => tick);

/**
 * A ruler of sixty ticks that fills as the countdown, the pomodoro phase or the
 * hour goes by, like the quarter marks under the progress bar on the reading
 * card. Every fifth tick is taller.
 */
function TimeRuler({
	progress,
	tone,
}: {
	progress: number;
	tone: "primary" | "info";
}) {
	const filled = Math.min(TICKS, Math.max(0, progress * TICKS));
	return (
		<div
			className="grid h-7 w-full grid-cols-[repeat(60,minmax(0,1fr))] items-end gap-px"
			aria-hidden
		>
			{RULER.map((index) => {
				const done = index + 1 <= Math.floor(filled);
				const current = !done && index < filled;
				return (
					<span
						key={index}
						className={cn(
							"w-full transition-colors duration-300 motion-reduce:transition-none",
							index % 5 === 0 ? "h-full" : "h-3/5",
							done
								? tone === "info"
									? "bg-info"
									: "bg-primary"
								: current
									? tone === "info"
										? "bg-info/50"
										: "bg-primary/50"
									: "bg-border",
						)}
					/>
				);
			})}
		</div>
	);
}

function statusText(
	config: TimerConfig,
	clock: TimerReading,
): { label: string; tone: "running" | "paused" | "break" | "done" } {
	if (clock.status === "paused") return { label: "Paused", tone: "paused" };
	if (clock.status === "done") return { label: "Finished", tone: "done" };
	if (config.mode === "pomodoro") {
		return clock.phase === "break"
			? { label: "Break", tone: "break" }
			: { label: `Reading · round ${clock.cycles + 1}`, tone: "running" };
	}
	if (config.mode === "countdown")
		return { label: "Time left", tone: "running" };
	return { label: "Reading", tone: "running" };
}

/** The clock, its ruler and what it is doing. The one big thing on the screen. */
export function ClockHero({
	clock,
	config,
	notice,
	canKeepReading,
	onKeepReading,
	onDismissNotice,
}: {
	clock: TimerReading;
	config: TimerConfig;
	notice: TimerNotice | null;
	canKeepReading: boolean;
	onKeepReading: () => void;
	onDismissNotice: () => void;
}) {
	const status = statusText(config, clock);
	const isBreak = clock.phase === "break";

	const progress =
		config.mode === "countdown" && config.targetMs
			? clock.readMs / config.targetMs
			: config.mode === "pomodoro" && clock.remainingMs != null
				? 1 -
					clock.remainingMs /
						(clock.phase === "reading" ? config.workMs : config.breakMs)
				: (clock.readMs % 3_600_000) / 3_600_000;

	const sub =
		config.mode === "free"
			? "Counting up. The ruler is the hour."
			: `${formatDuration(clock.readMs / 1000)} read`;

	return (
		<div className="flex w-full flex-col items-center gap-5 text-center">
			<p
				className={cn(
					"flex items-center gap-2 text-sm",
					isBreak ? "text-info-ink" : "text-muted-foreground",
				)}
			>
				<span
					aria-hidden
					className={cn(
						"size-2",
						status.tone === "running" && "bg-success",
						status.tone === "paused" && "bg-warning",
						status.tone === "break" && "bg-info",
						status.tone === "done" && "bg-muted-foreground",
					)}
				/>
				{status.label}
			</p>

			<p
				className={cn(
					"font-heading font-semibold text-7xl tabular-nums leading-none tracking-tight transition-opacity sm:text-8xl md:text-9xl",
					clock.status === "paused" && "opacity-50",
					isBreak && "text-info-ink",
				)}
				role="timer"
				aria-label={
					clock.direction === "down"
						? `${formatDuration(clock.displayMs / 1000)} left`
						: `${formatDuration(clock.displayMs / 1000)} read`
				}
			>
				{formatClock(clock.displayMs)}
			</p>

			<div className="flex w-full max-w-md flex-col gap-2">
				<TimeRuler progress={progress} tone={isBreak ? "info" : "primary"} />
				<p className="text-muted-foreground text-sm tabular-nums">{sub}</p>
			</div>

			{notice ? (
				<div
					role="status"
					className="flex w-full max-w-md flex-col gap-2 border border-primary/30 bg-primary/10 p-3 text-start text-sm"
				>
					<p className="font-medium">{notice.title}</p>
					<p className="text-muted-foreground">{notice.body}</p>
					<div className="flex flex-wrap gap-2">
						{clock.status === "done" && canKeepReading ? (
							<Button type="button" size="sm" onClick={onKeepReading}>
								Keep reading
							</Button>
						) : null}
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={onDismissNotice}
						>
							Dismiss
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
