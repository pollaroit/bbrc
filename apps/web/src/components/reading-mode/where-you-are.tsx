"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import {
	describePace,
	formatAudioTime,
	secondsFromHoursMinutes,
	splitSeconds,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Input } from "@bbrc/ui/components/input";
import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { usePagePosition } from "@/components/reading-mode/use-page-position";
import { bookCoverUrl } from "@/lib/book-cover";
import { useSetReadingTracking } from "@/lib/reading/use-reading";
import { useHoldRepeat } from "@/lib/reading-mode/use-hold-repeat";
import { useAutoPage, usePaceLearning } from "@/lib/reading-mode/use-pace";
import { cn } from "@/lib/utils";

function StepButton({
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
			className="size-14 shrink-0 touch-manipulation select-none"
			aria-label={label}
			{...handlers}
		>
			{direction === "down" ? <Minus aria-hidden /> : <Plus aria-hidden />}
		</Button>
	);
}

/** The length of the recording, asked once for a reading counted in listening time. */
function AudioLengthForm({
	onSave,
	pending,
	onCancel,
}: {
	onSave: (seconds: number) => void;
	pending: boolean;
	onCancel?: () => void;
}) {
	const hoursId = useId();
	const minutesId = useId();
	const [hours, setHours] = useState("");
	const [minutes, setMinutes] = useState("");
	const total = secondsFromHoursMinutes(
		Number(hours || 0),
		Number(minutes || 0),
	);
	return (
		<div className="flex flex-col gap-3">
			<p className="font-medium text-sm">How long is the recording?</p>
			<div className="flex items-end gap-2">
				<div className="flex flex-1 flex-col gap-1 text-muted-foreground text-xs">
					<label htmlFor={hoursId}>Hours</label>
					<Input
						id={hoursId}
						inputMode="numeric"
						className="h-12 text-center text-lg tabular-nums"
						value={hours}
						onChange={(event) =>
							setHours(event.target.value.replace(/\D/g, ""))
						}
					/>
				</div>
				<div className="flex flex-1 flex-col gap-1 text-muted-foreground text-xs">
					<label htmlFor={minutesId}>Minutes</label>
					<Input
						id={minutesId}
						inputMode="numeric"
						className="h-12 text-center text-lg tabular-nums"
						value={minutes}
						onChange={(event) =>
							setMinutes(event.target.value.replace(/\D/g, ""))
						}
					/>
				</div>
				<Button
					type="button"
					className="h-12"
					disabled={pending || total < 60}
					onClick={() => onSave(total)}
				>
					Save
				</Button>
			</div>
			{onCancel ? (
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					Cancel
				</Button>
			) : null}
		</div>
	);
}

/**
 * Your book and your place in it: the cover, a progress bar, and a big stepper
 * for the page you are on (or the time, for an audiobook). Press and hold to run
 * through it. With a running session it can also learn your pace and move the
 * page for you.
 */
export function WhereYouAre({
	reading,
	className,
	activeSeconds,
	running = false,
	sessionActive = false,
}: {
	reading: ReadingItem;
	className?: string;
	/** Active reading seconds in this session; given only inside Reading Mode. */
	activeSeconds?: () => number;
	running?: boolean;
	sessionActive?: boolean;
}) {
	const id = useId();
	const autoId = useId();
	const position = usePagePosition(reading);
	const tracking = useSetReadingTracking();
	const [askLength, setAskLength] = useState(false);
	const seconds = activeSeconds ?? (() => 0);

	const learn = usePaceLearning({
		reading,
		unit: position.unit,
		currentValue: position.current,
		activeSeconds: seconds,
		sessionActive,
	});
	const auto = useAutoPage({
		reading,
		unit: position.unit,
		max: position.max,
		confirmed: position.value,
		activeSeconds: seconds,
		running,
		commit: (value) => {
			position.set(value, { estimated: true });
			void position.flush();
		},
	});

	// What is shown: the estimate while auto mode is guessing, else the real number.
	const shown = auto.estimate ?? position.value;
	const estimateRef = useRef<number | null>(null);
	estimateRef.current = auto.estimate;

	/** The member says where they are: that is the truth, whatever was guessed. */
	function manualSet(next: number) {
		const clamped = position.set(next);
		estimateRef.current = null;
		learn.note(clamped);
		auto.confirm(clamped);
	}
	function manualNudge(by: number) {
		manualSet((estimateRef.current ?? position.current()) + by);
	}

	const percent =
		position.unit === "percent"
			? shown
			: Math.round((shown / Math.max(1, position.max)) * 100);
	const cover = reading.edition?.coverUrl
		? reading.edition.coverUrl
		: bookCoverUrl(reading.edition?.coverId ?? reading.book.coverId, "M");

	const needsLength = reading.trackByTime && reading.totalSeconds == null;
	const step = position.bySeconds ? 60 : 1;
	const time = splitSeconds(shown);
	const estimated = auto.estimate != null;

	return (
		<section
			aria-label="Where you are in the book"
			className={cn(
				"flex flex-col gap-4 border border-border bg-card p-4",
				className,
			)}
		>
			<div className="flex items-center gap-3">
				<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
					{cover ? (
						<Image
							src={cover}
							alt=""
							fill
							className="object-cover"
							sizes="40px"
						/>
					) : null}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<p className="truncate font-medium text-sm leading-tight">
						{reading.book.title}
					</p>
					<div className="h-1.5 w-full bg-muted" aria-hidden>
						<div
							className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="text-muted-foreground text-xs tabular-nums">
						{position.bySeconds
							? `${formatAudioTime(shown)} of ${formatAudioTime(position.max)}`
							: position.byPage
								? `Page ${shown} of ${position.max}`
								: "Your progress"}{" "}
						· {percent}%{estimated ? " · est." : ""}
					</p>
				</div>
			</div>

			{needsLength || askLength ? (
				<AudioLengthForm
					pending={tracking.isPending}
					onCancel={needsLength ? undefined : () => setAskLength(false)}
					onSave={(totalSeconds) =>
						tracking.mutate(
							{ id: reading.id, trackByTime: true, totalSeconds },
							{ onSuccess: () => setAskLength(false) },
						)
					}
				/>
			) : (
				<div className="flex items-center justify-center gap-2">
					<StepButton
						direction="down"
						label={
							position.bySeconds
								? "One minute back"
								: position.byPage
									? "One page back"
									: "One percent back"
						}
						onStep={() => manualNudge(-step)}
					/>
					<div className="flex min-w-0 flex-1 flex-col items-center">
						{position.bySeconds ? (
							<div className="flex items-end justify-center gap-1">
								<label className="flex flex-col items-center text-muted-foreground text-xs">
									<input
										type="text"
										inputMode="numeric"
										autoComplete="off"
										aria-label="Hours listened"
										value={time.hours}
										onChange={(event) =>
											manualSet(
												secondsFromHoursMinutes(
													Number(event.target.value.replace(/\D/g, "") || 0),
													time.minutes,
												),
											)
										}
										onFocus={(event) => event.target.select()}
										onBlur={() => void position.flush()}
										className="h-14 w-16 border-0 bg-transparent text-center font-heading font-semibold text-4xl text-foreground tabular-nums leading-none outline-none focus-visible:bg-muted/40"
									/>
									h
								</label>
								<label className="flex flex-col items-center text-muted-foreground text-xs">
									<input
										type="text"
										inputMode="numeric"
										autoComplete="off"
										aria-label="Minutes listened"
										value={String(time.minutes).padStart(2, "0")}
										onChange={(event) =>
											manualSet(
												secondsFromHoursMinutes(
													time.hours,
													Math.min(
														59,
														Number(event.target.value.replace(/\D/g, "") || 0),
													),
												),
											)
										}
										onFocus={(event) => event.target.select()}
										onBlur={() => void position.flush()}
										className="h-14 w-16 border-0 bg-transparent text-center font-heading font-semibold text-4xl text-foreground tabular-nums leading-none outline-none focus-visible:bg-muted/40"
									/>
									min
								</label>
							</div>
						) : (
							<>
								<label htmlFor={id} className="sr-only">
									{position.byPage
										? "Page you are on"
										: "Percent you have read"}
								</label>
								<input
									id={id}
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									autoComplete="off"
									value={shown}
									onChange={(event) => {
										const digits = event.target.value.replace(/\D/g, "");
										manualSet(digits === "" ? 0 : Number.parseInt(digits, 10));
									}}
									onFocus={(event) => event.target.select()}
									onBlur={() => void position.flush()}
									className="h-14 w-full min-w-0 border-0 bg-transparent text-center font-heading font-semibold text-4xl tabular-nums leading-none outline-none focus-visible:bg-muted/40"
								/>
								<span className="text-muted-foreground text-xs">
									{position.byPage ? `of ${position.max} pages` : "percent"}
									{estimated ? " · estimated" : ""}
								</span>
							</>
						)}
					</div>
					<StepButton
						direction="up"
						label={
							position.bySeconds
								? "One minute forward"
								: position.byPage
									? "One page forward"
									: "One percent forward"
						}
						onStep={() => manualNudge(step)}
					/>
				</div>
			)}

			{!needsLength && !askLength ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="self-center text-muted-foreground"
					disabled={tracking.isPending}
					onClick={() => {
						if (reading.trackByTime) {
							tracking.mutate({ id: reading.id, trackByTime: false });
						} else if (reading.totalSeconds != null) {
							tracking.mutate({ id: reading.id, trackByTime: true });
						} else {
							setAskLength(true);
						}
					}}
				>
					{reading.trackByTime
						? "Count pages instead"
						: "Listening to an audiobook? Track by time"}
				</Button>
			) : null}

			{activeSeconds && !needsLength ? (
				<div className="flex flex-col gap-2 border-border border-t pt-3">
					{learn.learning ? (
						<>
							<p className="text-sm">
								Learning your pace. Keep reading and update your page now and
								then.{" "}
								<span className="text-muted-foreground tabular-nums">
									{learn.ready
										? "You can finish now, or keep going for a better result."
										: "Read for a minute or two and update your page at least twice."}
								</span>
							</p>
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									disabled={!learn.ready}
									onClick={learn.finish}
								>
									Finish learning
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={learn.cancel}
								>
									Cancel
								</Button>
							</div>
						</>
					) : (
						<>
							{reading.learnedPace != null ? (
								<p className="text-muted-foreground text-xs">
									Your pace on this book:{" "}
									{describePace(reading.learnedPace, position.unit)}.
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									Learn how fast you read, and your page can follow along.
								</p>
							)}
							{learn.failed ? (
								<p className="text-sm text-warning-ink">
									Not enough to learn from yet. Read a bit more, update your
									page a couple of times, and try again.
								</p>
							) : null}
							<div className="flex flex-wrap items-center gap-3">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={!sessionActive || learn.saving}
									title={
										sessionActive
											? undefined
											: "Start the timer to learn your pace"
									}
									onClick={learn.start}
								>
									{reading.learnedPace != null
										? "Learn again"
										: "Learn my pace"}
								</Button>
								{reading.learnedPace != null ? (
									<div className="flex items-center gap-2 text-sm">
										<Checkbox
											id={autoId}
											checked={reading.autoPage}
											disabled={learn.saving}
											onCheckedChange={(checked) =>
												learn.setAuto(checked === true)
											}
										/>
										<label htmlFor={autoId}>Move my page for me</label>
									</div>
								) : null}
							</div>
						</>
					)}
				</div>
			) : null}
		</section>
	);
}
