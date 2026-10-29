"use client";

import {
	COUNTDOWN_MAX_MINUTES,
	COUNTDOWN_MIN_MINUTES,
	createTimerConfig,
	type TimerConfig,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Play } from "lucide-react";
import { useId } from "react";
import {
	askNotificationPermission,
	notificationPermission,
} from "@/lib/reading-mode/alerts";
import type { ModePrefs } from "@/lib/reading-mode/storage";
import { cn } from "@/lib/utils";

const MODES = [
	{
		id: "free",
		label: "Stopwatch",
		hint: "Counts up. Stop whenever you like.",
	},
	{
		id: "countdown",
		label: "Countdown",
		hint: "Read for a set time. You get a signal at the end.",
	},
	{
		id: "pomodoro",
		label: "Pomodoro",
		hint: "Reading rounds with short breaks. Breaks do not count as reading.",
	},
] as const;

const PRESETS = [15, 25, 45, 60];

function configOf(prefs: ModePrefs): TimerConfig {
	if (prefs.mode === "countdown") {
		return createTimerConfig({
			mode: "countdown",
			minutes: prefs.countdownMinutes,
		});
	}
	if (prefs.mode === "pomodoro") {
		return createTimerConfig({
			mode: "pomodoro",
			workMinutes: prefs.workMinutes,
			breakMinutes: prefs.breakMinutes,
		});
	}
	return createTimerConfig({ mode: "free" });
}

function MinutesField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
}) {
	const id = useId();
	return (
		<div className="flex items-center gap-2 text-sm">
			<label htmlFor={id} className="text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
				type="number"
				inputMode="numeric"
				min={COUNTDOWN_MIN_MINUTES}
				max={COUNTDOWN_MAX_MINUTES}
				value={value}
				onChange={(event) => {
					const parsed = Number.parseInt(event.target.value, 10);
					if (Number.isFinite(parsed)) onChange(parsed);
				}}
				className="h-11 w-20 text-center text-base tabular-nums"
			/>
			<span className="text-muted-foreground">min</span>
		</div>
	);
}

/** Choosing how to time the session, then starting it. */
export function ModeSetup({
	prefs,
	onChange,
	onStart,
	busy,
}: {
	prefs: ModePrefs;
	onChange: (prefs: ModePrefs) => void;
	onStart: (config: TimerConfig) => void;
	busy: boolean;
}) {
	const mode = MODES.find((entry) => entry.id === prefs.mode) ?? MODES[0];

	async function start() {
		// A signal at the end is the point of a countdown or pomodoro, so ask once, from this tap.
		if (prefs.mode !== "free" && notificationPermission() === "default") {
			await askNotificationPermission();
		}
		onStart(configOf(prefs));
	}

	return (
		<section
			aria-label="How do you want to time it?"
			className="flex w-full max-w-sm flex-col gap-4"
		>
			<fieldset className="m-0 grid min-w-0 grid-cols-3 border border-border p-0">
				<legend className="sr-only">Timer type</legend>
				{MODES.map((entry) => (
					<button
						key={entry.id}
						type="button"
						aria-pressed={prefs.mode === entry.id}
						onClick={() => onChange({ ...prefs, mode: entry.id })}
						className={cn(
							"h-12 border-border border-r px-2 text-sm transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
							prefs.mode === entry.id
								? "bg-primary text-primary-foreground"
								: "hover:bg-muted/50",
						)}
					>
						{entry.label}
					</button>
				))}
			</fieldset>

			<p className="text-center text-muted-foreground text-sm">{mode.hint}</p>

			{prefs.mode === "countdown" ? (
				<div className="flex flex-col items-center gap-3">
					<div className="flex flex-wrap justify-center gap-1.5">
						{PRESETS.map((minutes) => (
							<Button
								key={minutes}
								type="button"
								variant={
									prefs.countdownMinutes === minutes ? "default" : "outline"
								}
								className="h-10 min-w-14"
								onClick={() =>
									onChange({ ...prefs, countdownMinutes: minutes })
								}
							>
								{minutes}
							</Button>
						))}
					</div>
					<MinutesField
						label="Read for"
						value={prefs.countdownMinutes}
						onChange={(value) =>
							onChange({ ...prefs, countdownMinutes: value })
						}
					/>
				</div>
			) : null}

			{prefs.mode === "pomodoro" ? (
				<div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
					<MinutesField
						label="Read"
						value={prefs.workMinutes}
						onChange={(value) => onChange({ ...prefs, workMinutes: value })}
					/>
					<MinutesField
						label="Break"
						value={prefs.breakMinutes}
						onChange={(value) => onChange({ ...prefs, breakMinutes: value })}
					/>
				</div>
			) : null}

			<LoadingButton
				type="button"
				loading={busy}
				className="h-14 w-full text-base"
				onClick={() => void start()}
			>
				<Play data-icon="inline-start" aria-hidden />
				Start reading
			</LoadingButton>
		</section>
	);
}
