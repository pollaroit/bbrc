"use client";

import {
	COUNTDOWN_MAX_MINUTES,
	COUNTDOWN_MIN_MINUTES,
	createTimerConfig,
	type TimerConfig,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Hourglass, Minus, Play, Plus, Repeat, Timer } from "lucide-react";
import type { ComponentType } from "react";
import { useId } from "react";
import {
	askNotificationPermission,
	notificationPermission,
} from "@/lib/reading-mode/alerts";
import type { ModePrefs } from "@/lib/reading-mode/storage";
import { useHoldRepeat } from "@/lib/reading-mode/use-hold-repeat";
import { cn } from "@/lib/utils";

const MODES: {
	id: ModePrefs["mode"];
	label: string;
	hint: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{
		id: "free",
		label: "Stopwatch",
		hint: "Count up, stop any time",
		icon: Timer,
	},
	{
		id: "countdown",
		label: "Countdown",
		hint: "Read for a set time",
		icon: Hourglass,
	},
	{
		id: "pomodoro",
		label: "Pomodoro",
		hint: "Rounds with short breaks",
		icon: Repeat,
	},
];

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

function clampMinutes(value: number) {
	return Math.min(
		COUNTDOWN_MAX_MINUTES,
		Math.max(COUNTDOWN_MIN_MINUTES, value),
	);
}

function RoundButton({
	direction,
	onStep,
	label,
}: {
	direction: "down" | "up";
	onStep: () => void;
	label: string;
}) {
	const handlers = useHoldRepeat(onStep);
	return (
		<Button
			type="button"
			variant="outline"
			className="size-12 shrink-0 touch-manipulation select-none"
			aria-label={label}
			{...handlers}
		>
			{direction === "down" ? <Minus aria-hidden /> : <Plus aria-hidden />}
		</Button>
	);
}

/** Minutes with a big minus and plus, and a box to type in. No browser spinners. */
function MinutesStepper({
	label,
	value,
	step,
	onChange,
}: {
	label: string;
	value: number;
	step: number;
	onChange: (value: number) => void;
}) {
	const id = useId();
	return (
		<div className="flex flex-col items-center gap-1.5">
			<label htmlFor={id} className="text-muted-foreground text-sm">
				{label}
			</label>
			<div className="flex items-center gap-2">
				<RoundButton
					direction="down"
					label={`${label}: less`}
					onStep={() => onChange(clampMinutes(value - step))}
				/>
				<div className="flex w-20 flex-col items-center">
					<input
						id={id}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						autoComplete="off"
						value={value}
						onChange={(event) => {
							const digits = event.target.value.replace(/\D/g, "");
							onChange(
								clampMinutes(digits === "" ? 0 : Number.parseInt(digits, 10)),
							);
						}}
						onFocus={(event) => event.target.select()}
						className="h-12 w-full border-0 bg-transparent text-center font-heading font-semibold text-3xl tabular-nums leading-none outline-none focus-visible:bg-muted/40"
					/>
					<span className="text-muted-foreground text-xs">minutes</span>
				</div>
				<RoundButton
					direction="up"
					label={`${label}: more`}
					onStep={() => onChange(clampMinutes(value + step))}
				/>
			</div>
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
			className="flex w-full max-w-md flex-col gap-5"
		>
			<fieldset className="m-0 grid min-w-0 grid-cols-3 gap-2 border-0 p-0">
				<legend className="sr-only">Timer type</legend>
				{MODES.map((entry) => {
					const Icon = entry.icon;
					const selected = prefs.mode === entry.id;
					return (
						<button
							key={entry.id}
							type="button"
							aria-pressed={selected}
							onClick={() => onChange({ ...prefs, mode: entry.id })}
							className={cn(
								"flex min-h-24 flex-col items-start gap-2 border p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring",
								selected
									? "border-primary bg-primary/5 ring-1 ring-primary"
									: "border-border hover:bg-muted/40",
							)}
						>
							<Icon
								className={cn(
									"size-5",
									selected ? "text-primary" : "text-muted-foreground",
								)}
							/>
							<span className="flex flex-col">
								<span className="font-medium text-sm">{entry.label}</span>
								<span className="text-muted-foreground text-xs leading-snug">
									{entry.hint}
								</span>
							</span>
						</button>
					);
				})}
			</fieldset>

			{prefs.mode === "countdown" ? (
				<div className="flex flex-col items-center gap-4 border border-border bg-card p-4">
					<MinutesStepper
						label="Read for"
						value={prefs.countdownMinutes}
						step={5}
						onChange={(value) =>
							onChange({ ...prefs, countdownMinutes: value })
						}
					/>
					<div className="flex flex-wrap justify-center gap-1.5">
						{PRESETS.map((minutes) => (
							<Button
								key={minutes}
								type="button"
								variant={
									prefs.countdownMinutes === minutes ? "default" : "outline"
								}
								className="h-10 min-w-16"
								onClick={() =>
									onChange({ ...prefs, countdownMinutes: minutes })
								}
							>
								{minutes} min
							</Button>
						))}
					</div>
				</div>
			) : null}

			{prefs.mode === "pomodoro" ? (
				<div className="flex flex-col items-center gap-3 border border-border bg-card p-4">
					<div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
						<MinutesStepper
							label="Reading round"
							value={prefs.workMinutes}
							step={5}
							onChange={(value) => onChange({ ...prefs, workMinutes: value })}
						/>
						<MinutesStepper
							label="Break"
							value={prefs.breakMinutes}
							step={1}
							onChange={(value) => onChange({ ...prefs, breakMinutes: value })}
						/>
					</div>
					<p className="text-center text-muted-foreground text-xs">
						Breaks do not count as reading time.
					</p>
				</div>
			) : null}

			{prefs.mode === "free" ? (
				<p className="text-center text-muted-foreground text-sm">
					No target. Press Finish when you are done.
				</p>
			) : null}

			<LoadingButton
				type="button"
				loading={busy}
				className="h-16 w-full text-base"
				onClick={() => void start()}
			>
				<Play data-icon="inline-start" aria-hidden />
				Start reading
			</LoadingButton>
		</section>
	);
}
