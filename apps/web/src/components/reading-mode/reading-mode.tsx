"use client";

import {
	formatClock,
	formatDuration,
	plainTextToRichDocument,
	serializeRichDocument,
	TIMER_MAX_READING_MS,
	type TimerConfig,
} from "@bbrc/shared";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	ArrowLeft,
	BookCheck,
	MoreHorizontal,
	Pause,
	Play,
	RotateCcw,
	SkipForward,
	Square,
	Trash2,
	Volume2,
	VolumeX,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { ConfirmDialog } from "@/components/reading-mode/confirm-dialog";
import { ModeSetup } from "@/components/reading-mode/mode-setup";
import { MusicMiniPlayer } from "@/components/reading-mode/music-player";
import { PageStepper } from "@/components/reading-mode/page-stepper";
import { PresenceLine } from "@/components/reading-mode/presence-line";
import { SessionSummary } from "@/components/reading-mode/session-summary";
import { SoundSheet } from "@/components/reading-mode/sound-sheet";
import { useSounds } from "@/components/reading-mode/use-sounds";
import { bookCoverUrl } from "@/lib/book-cover";
import { useAbandonReading, useReadingState } from "@/lib/reading/use-reading";
import {
	DEFAULT_MODE_PREFS,
	loadModePrefs,
	type ModePrefs,
	saveModePrefs,
} from "@/lib/reading-mode/storage";
import { useReadingSession } from "@/lib/reading-mode/use-reading-session";
import { useWakeLock } from "@/lib/reading-mode/use-wake-lock";
import { cn } from "@/lib/utils";

// The finish dialog carries the editor and the review form, so it loads when asked.
const BookMarkReadDialog = dynamic(
	() =>
		import("@/components/blocks/book-mark-read-dialog").then(
			(mod) => mod.BookMarkReadDialog,
		),
	{ ssr: false },
);

function phaseLabel(
	mode: TimerConfig["mode"],
	phase: "reading" | "break",
	status: string,
	cycles: number,
): string {
	if (status === "paused") return "Paused";
	if (status === "done") return "Done";
	if (mode === "pomodoro") {
		return phase === "break" ? "Break" : `Reading · round ${cycles + 1}`;
	}
	if (mode === "countdown") return "Time left";
	return "Reading";
}

/**
 * Reading Mode: a calm, full-screen companion while you read. A big clock, the
 * page you are on, sounds if you want them, and nothing else on screen.
 */
export function ReadingMode({ bookSlug }: { bookSlug: string }) {
	const router = useRouter();
	const state = useReadingState(bookSlug);
	const reading = state.data?.reading ?? null;
	const abandon = useAbandonReading();
	const { openCompose } = useComposePost();
	const sounds = useSounds();

	const session = useReadingSession(reading?.id ?? "");
	const { phase, timer, reading: clock } = session;

	const [prefs, setPrefs] = useState<ModePrefs>(DEFAULT_MODE_PREFS);
	const [soundsOpen, setSoundsOpen] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);
	const [finishSessionOpen, setFinishSessionOpen] = useState(false);
	const [startOverOpen, setStartOverOpen] = useState(false);
	const [finishBookOpen, setFinishBookOpen] = useState(false);
	const [abandonOpen, setAbandonOpen] = useState(false);

	useEffect(() => {
		setPrefs(loadModePrefs());
	}, []);
	function changePrefs(next: ModePrefs) {
		setPrefs(next);
		saveModePrefs(next);
	}

	const running = phase.kind === "active" && timer?.status === "running";
	useWakeLock(running);

	// Closing the tab mid-session asks first; the time is kept either way.
	useEffect(() => {
		if (!running) return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [running]);

	function fail(error: unknown) {
		toast.error(
			error instanceof Error
				? error.message
				: "Something went wrong. Try again.",
		);
	}

	function goBack() {
		if (window.history.length > 1) router.back();
		else router.push(`/books/${bookSlug}` as Route);
	}

	function requestLeave() {
		if (phase.kind === "active") setLeaveOpen(true);
		else goBack();
	}

	async function endAndLeave() {
		await session.finish().catch(() => undefined);
		goBack();
	}

	if (state.isPending || (reading && phase.kind === "loading")) {
		return (
			<div className="grid min-h-dvh place-items-center bg-background p-6">
				<Skeleton className="h-40 w-72" aria-hidden />
			</div>
		);
	}

	if (!reading) {
		return (
			<main className="grid min-h-dvh place-items-center bg-background p-6">
				<div className="flex max-w-sm flex-col items-center gap-4 text-center">
					<h1 className="font-semibold text-xl tracking-tight">
						You are not reading this book
					</h1>
					<p className="text-muted-foreground text-sm">
						Start reading it first, and Reading Mode opens from your reading
						card.
					</p>
					<Button
						render={<Link href={`/books/${bookSlug}` as Route} />}
						nativeButton={false}
					>
						Go to the book
					</Button>
				</div>
			</main>
		);
	}

	const cover = reading.edition?.coverUrl
		? reading.edition.coverUrl
		: bookCoverUrl(reading.edition?.coverId ?? reading.book.coverId, "M");
	const byPage = reading.totalPages != null && reading.currentPage != null;

	const config = timer?.config;
	const progress =
		clock && config
			? config.mode === "countdown" && config.targetMs
				? clock.readMs / config.targetMs
				: config.mode === "pomodoro" && clock.remainingMs != null
					? 1 -
						clock.remainingMs /
							(clock.phase === "reading" ? config.workMs : config.breakMs)
					: reading.percent / 100
			: reading.percent / 100;

	const canKeepReading = (clock?.readMs ?? 0) < TIMER_MAX_READING_MS;
	const isBreak = clock?.phase === "break";
	const done = clock?.status === "done";
	const paused = clock?.status === "paused";

	return (
		<div
			className={cn(
				"relative flex min-h-dvh flex-col bg-background text-foreground transition-[filter] duration-300 motion-reduce:transition-none",
			)}
			style={prefs.dim ? { filter: "brightness(0.55)" } : undefined}
		>
			{/* A hairline across the top fills with the countdown, the phase, or the book. */}
			<span
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-muted"
			>
				<span
					className="block h-full bg-primary transition-[width] duration-500 ease-linear motion-reduce:transition-none"
					style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
				/>
			</span>

			<header className="flex items-center gap-3 px-3 pt-4 pb-2">
				<Button
					type="button"
					variant="ghost"
					className="size-11 shrink-0"
					onClick={requestLeave}
					aria-label="Leave Reading Mode"
				>
					<ArrowLeft aria-hidden />
				</Button>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<span className="relative block aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
						{cover ? (
							<Image
								src={cover}
								alt=""
								fill
								className="object-cover"
								sizes="32px"
							/>
						) : null}
					</span>
					<div className="min-w-0">
						<p className="truncate font-medium text-sm leading-tight">
							{reading.book.title}
						</p>
						<p className="truncate text-muted-foreground text-xs">
							{reading.book.authors.join(", ")}
						</p>
					</div>
				</div>
				<Button
					type="button"
					variant="ghost"
					className="size-11 shrink-0"
					onClick={() => setSoundsOpen(true)}
					aria-label={sounds.anyPlaying ? "Sounds (playing)" : "Sounds"}
				>
					{sounds.anyPlaying ? (
						<Volume2 aria-hidden />
					) : (
						<VolumeX aria-hidden className="text-muted-foreground" />
					)}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type="button"
								variant="ghost"
								className="size-11 shrink-0"
								aria-label="More"
							/>
						}
					>
						<MoreHorizontal aria-hidden />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-56">
						<DropdownMenuCheckboxItem
							checked={prefs.dim}
							onCheckedChange={(checked) =>
								changePrefs({ ...prefs, dim: checked === true })
							}
						>
							Dim the screen
						</DropdownMenuCheckboxItem>
						{phase.kind === "active" ? (
							<DropdownMenuItem onClick={() => setStartOverOpen(true)}>
								<RotateCcw aria-hidden />
								Start over
							</DropdownMenuItem>
						) : null}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => {
								// Save the session first, then ask about the book.
								void (async () => {
									if (phase.kind === "active") {
										await session.finish().catch(() => undefined);
									}
									setFinishBookOpen(true);
								})();
							}}
						>
							<BookCheck aria-hidden />I finished the book
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={() => setAbandonOpen(true)}
						>
							<Trash2 aria-hidden />
							Stop reading this book
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
				{phase.kind === "setup" ? (
					<>
						<div className="flex flex-col items-center gap-2 text-center">
							<p className="font-heading font-semibold text-7xl text-muted-foreground/50 tabular-nums leading-none tracking-tight sm:text-8xl">
								00:00
							</p>
							<p className="text-muted-foreground text-sm">
								Ready when you are
							</p>
						</div>
						<ModeSetup
							prefs={prefs}
							onChange={changePrefs}
							busy={session.busy}
							onStart={(next) =>
								void session.begin(next).catch((error: unknown) => fail(error))
							}
						/>
						<PresenceLine bookSlug={bookSlug} refresh />
					</>
				) : null}

				{phase.kind === "active" && clock && config ? (
					<>
						<div className="flex flex-col items-center gap-3 text-center">
							<p
								className={cn(
									"text-sm",
									isBreak ? "text-info-ink" : "text-muted-foreground",
								)}
							>
								{phaseLabel(
									config.mode,
									clock.phase,
									clock.status,
									clock.cycles,
								)}
							</p>
							<p
								className={cn(
									"font-heading font-semibold text-7xl tabular-nums leading-none tracking-tight sm:text-8xl md:text-9xl",
									paused && "opacity-60",
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
							<p className="text-muted-foreground text-sm tabular-nums">
								{clock.direction === "down"
									? `${formatDuration(clock.readMs / 1000)} read`
									: config.mode === "free"
										? "Counting up"
										: ""}
							</p>
						</div>

						{session.notice ? (
							<div
								role="status"
								className="flex w-full max-w-sm flex-col gap-2 border border-primary/30 bg-primary/10 p-3 text-sm"
							>
								<p className="font-medium">{session.notice.title}</p>
								<p className="text-muted-foreground">{session.notice.body}</p>
								<div className="flex flex-wrap gap-2">
									{done && canKeepReading ? (
										<Button
											type="button"
											size="sm"
											onClick={() => session.keepReading()}
										>
											Keep reading
										</Button>
									) : null}
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => session.dismissNotice()}
									>
										Dismiss
									</Button>
								</div>
							</div>
						) : null}

						<PresenceLine bookSlug={bookSlug} refresh />
					</>
				) : null}

				{phase.kind === "ended" ? (
					<SessionSummary
						summary={phase.summary}
						seconds={phase.seconds}
						notice={phase.notice}
						byPage={byPage}
						bookTitle={reading.book.title}
						onShare={() => {
							const text = `Read ${reading.book.title} for ${formatDuration(phase.seconds)}${
								phase.summary &&
								phase.summary.pageFrom != null &&
								phase.summary.pageTo != null &&
								phase.summary.pageTo > phase.summary.pageFrom
									? ` (${phase.summary.pageTo - phase.summary.pageFrom} pages)`
									: ""
							}.`;
							openCompose(
								{ kind: "book", slug: bookSlug },
								serializeRichDocument(plainTextToRichDocument(text)),
							);
						}}
						onAgain={() => session.backToSetup()}
						onDone={goBack}
					/>
				) : null}
			</main>

			{phase.kind === "active" && clock ? (
				<footer
					className="flex flex-col gap-3 border-border border-t bg-background px-4 pt-3"
					style={{
						paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
					}}
				>
					<PageStepper reading={reading} />
					<div className="grid grid-cols-[1fr_auto] gap-2">
						{done ? (
							canKeepReading ? (
								<Button
									type="button"
									className="h-14 text-base"
									onClick={() => session.keepReading()}
								>
									<Play data-icon="inline-start" aria-hidden />
									Keep reading
								</Button>
							) : (
								<Button
									type="button"
									className="h-14 text-base"
									onClick={() => void session.finish().catch(fail)}
								>
									<Square data-icon="inline-start" aria-hidden />
									Finish session
								</Button>
							)
						) : paused ? (
							<Button
								type="button"
								className="h-14 text-base"
								onClick={() => void session.resume()}
							>
								<Play data-icon="inline-start" aria-hidden />
								Resume
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								className="h-14 text-base"
								onClick={() => session.pause()}
							>
								<Pause data-icon="inline-start" aria-hidden />
								Pause
							</Button>
						)}
						{isBreak ? (
							<Button
								type="button"
								variant="outline"
								className="h-14 px-4"
								onClick={() => session.skip()}
							>
								<SkipForward data-icon="inline-start" aria-hidden />
								Skip break
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								className="h-14 px-4"
								onClick={() => setFinishSessionOpen(true)}
							>
								<Square data-icon="inline-start" aria-hidden />
								Finish
							</Button>
						)}
					</div>
				</footer>
			) : null}

			<MusicMiniPlayer sounds={sounds} />
			<SoundSheet
				open={soundsOpen}
				onOpenChange={setSoundsOpen}
				sounds={sounds}
			/>

			{/* Another device or tab has a session for this book open. */}
			<AlertDialog open={phase.kind === "takeover"}>
				<AlertDialogContent>
					<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
						<AlertDialogTitle>
							Reading Mode is already open for this book
						</AlertDialogTitle>
						<AlertDialogDescription>
							{phase.kind === "takeover"
								? `A session with ${formatDuration(phase.session.activeSeconds)} of reading is running on another device or tab. You can carry it on here, or start a new one.`
								: null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => session.backToSetup()}>
							Start a new session
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (phase.kind === "takeover") session.adopt(phase.session);
							}}
						>
							Carry on here
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<ConfirmDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				title="End this session?"
				description={`Leaving ends the session and saves ${formatDuration(session.secondsNow())} of reading.`}
				confirmLabel="End and leave"
				onConfirm={() => void endAndLeave()}
			/>
			<ConfirmDialog
				open={finishSessionOpen}
				onOpenChange={setFinishSessionOpen}
				title="Finish this session?"
				description={`This saves ${formatDuration(session.secondsNow())} of reading. Your page stays where it is.`}
				confirmLabel="Finish session"
				onConfirm={() => void session.finish().catch(fail)}
			/>
			<ConfirmDialog
				open={startOverOpen}
				onOpenChange={setStartOverOpen}
				title="Start over?"
				description={`This saves the ${formatDuration(session.secondsNow())} you have read so far and gives you a fresh timer.`}
				confirmLabel="Save and start over"
				onConfirm={() => {
					void session
						.finish()
						.then(() => session.backToSetup())
						.catch(fail);
				}}
			/>
			{finishBookOpen ? (
				<BookMarkReadDialog
					bookSlug={bookSlug}
					bookTitle={reading.book.title}
					open={finishBookOpen}
					onOpenChange={setFinishBookOpen}
				/>
			) : null}
			<DestructiveConfirmDialog
				open={abandonOpen}
				onOpenChange={setAbandonOpen}
				title="Stop reading this book?"
				description="Your progress and reading sessions for this book are deleted. You can start it again any time."
				confirmLabel="Stop reading"
				onConfirm={() => {
					setAbandonOpen(false);
					abandon.mutate({ id: reading.id });
					router.push(`/books/${bookSlug}` as Route);
				}}
			/>
		</div>
	);
}
