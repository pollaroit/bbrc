"use client";

import { formatDuration, TIMER_MAX_READING_MS } from "@bbrc/shared";
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
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation } from "@tanstack/react-query";
import {
	ArrowLeft,
	Minus,
	Moon,
	MoreHorizontal,
	Plus,
	RotateCcw,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ClockHero } from "@/components/reading-mode/clock-hero";
import { ConfirmDialog } from "@/components/reading-mode/confirm-dialog";
import { Dock } from "@/components/reading-mode/dock";
import { ModeSetup } from "@/components/reading-mode/mode-setup";
import { NowPlaying } from "@/components/reading-mode/now-playing";
import { SessionSummary } from "@/components/reading-mode/session-summary";
import { SoundsPanel } from "@/components/reading-mode/sounds-panel";
import { useSounds } from "@/components/reading-mode/use-sounds";
import {
	DEFAULT_MODE_PREFS,
	loadModePrefs,
	type ModePrefs,
	saveModePrefs,
} from "@/lib/reading-mode/storage";
import { useHoldRepeat } from "@/lib/reading-mode/use-hold-repeat";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { useReadingSession } from "@/lib/reading-mode/use-reading-session";
import { useWakeLock } from "@/lib/reading-mode/use-wake-lock";
import { orpc } from "@/utils/orpc";

const LABEL_MAX = 40;

/**
 * Pages read in this session, typed or stepped by hand. Optional: it is a tally
 * for the session summary and is never linked to a book.
 */
function PagesThisSession({ sessionId }: { sessionId: string | null }) {
	const id = useId();
	const [pages, setPages] = useState(0);
	const save = useMutation(orpc.readingSession.setPages.mutationOptions());
	const saveTimer = useRef<number | null>(null);

	function change(next: number) {
		const clean = Math.min(20000, Math.max(0, Math.round(next)));
		setPages(clean);
		if (!sessionId) return;
		if (saveTimer.current) window.clearTimeout(saveTimer.current);
		saveTimer.current = window.setTimeout(() => {
			save.mutate({ sessionId, pages: clean });
		}, 600);
	}

	const down = useHoldRepeat(() => change(pages - 1));
	const up = useHoldRepeat(() => change(pages + 1));

	useEffect(
		() => () => {
			if (saveTimer.current) window.clearTimeout(saveTimer.current);
		},
		[],
	);

	return (
		<section
			aria-label="Pages this session"
			className="flex w-full flex-col gap-2 border border-border bg-card p-4"
		>
			<label htmlFor={id} className="font-medium text-sm">
				Pages read this session
			</label>
			<p className="text-muted-foreground text-xs">
				Optional. Keep a count if you are reading a book on the side.
			</p>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					className="size-14 shrink-0 touch-manipulation select-none"
					aria-label="One page less"
					{...down}
				>
					<Minus aria-hidden />
				</Button>
				<Input
					id={id}
					inputMode="numeric"
					className="h-14 text-center font-heading font-semibold text-2xl tabular-nums"
					value={pages}
					onChange={(event) => {
						const digits = event.target.value.replace(/\D/g, "");
						change(digits === "" ? 0 : Number(digits));
					}}
				/>
				<Button
					type="button"
					variant="outline"
					className="size-14 shrink-0 touch-manipulation select-none"
					aria-label="One page more"
					{...up}
				>
					<Plus aria-hidden />
				</Button>
			</div>
		</section>
	);
}

/**
 * Reading Mode without a book: the same calm timer, sounds and music for anything
 * (studying, a pomodoro, reading something we do not have). It is saved, but never
 * counts towards reading stats, streaks, achievements or "reading now".
 */
export function FreeReadingMode() {
	const router = useRouter();
	const sounds = useSounds();
	const wide = useMediaQuery("(min-width: 1024px)");
	const session = useReadingSession("", { free: true });
	const { phase, timer, reading: clock } = session;

	const [prefs, setPrefs] = useState<ModePrefs>(DEFAULT_MODE_PREFS);
	const [label, setLabel] = useState("");
	const [soundsOpen, setSoundsOpen] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);
	const [finishSessionOpen, setFinishSessionOpen] = useState(false);
	const [startOverOpen, setStartOverOpen] = useState(false);

	useEffect(() => {
		setPrefs(loadModePrefs());
	}, []);
	function changePrefs(next: ModePrefs) {
		setPrefs(next);
		saveModePrefs(next);
	}

	const running = phase.kind === "active" && timer?.status === "running";
	useWakeLock(running);

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
		else router.push("/" as Route);
	}

	async function endAndLeave() {
		await session.finish().catch(() => undefined);
		goBack();
	}

	if (phase.kind === "loading") {
		return (
			<div className="grid h-dvh place-items-center bg-background p-6">
				<div
					className="flex w-full max-w-sm flex-col items-center gap-4"
					aria-hidden
				>
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-24 w-72" />
					<Skeleton className="h-7 w-full" />
				</div>
			</div>
		);
	}

	const config = timer?.config;
	const active = phase.kind === "active" && clock != null && config != null;
	const canKeepReading = (clock?.readMs ?? 0) < TIMER_MAX_READING_MS;
	const isBreak = clock?.phase === "break";
	const sessionId =
		phase.kind === "active" && timer ? sessionIdOf(session) : null;

	const player = sounds.station ? <NowPlaying sounds={sounds} /> : null;
	const pages =
		phase.kind === "active" ? <PagesThisSession sessionId={sessionId} /> : null;

	return (
		<div
			className="flex h-dvh flex-col bg-background text-foreground transition-[filter] duration-300 motion-reduce:transition-none"
			style={prefs.dim ? { filter: "brightness(0.55)" } : undefined}
		>
			<header className="flex items-center gap-2 border-border border-b px-3 py-2.5">
				<Button
					type="button"
					variant="ghost"
					className="size-11 shrink-0"
					onClick={() =>
						phase.kind === "active" ? setLeaveOpen(true) : goBack()
					}
					aria-label="Leave Reading Mode"
				>
					<ArrowLeft aria-hidden />
				</Button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm leading-tight">
						Reading Mode
					</p>
					<p className="truncate text-muted-foreground text-xs">
						{label.trim() || "Without a book"}
					</p>
				</div>
				<Button
					type="button"
					variant={prefs.dim ? "secondary" : "ghost"}
					className="size-11 shrink-0"
					aria-pressed={prefs.dim}
					aria-label="Dim the screen"
					title="Dim the screen"
					onClick={() => changePrefs({ ...prefs, dim: !prefs.dim })}
				>
					<Moon aria-hidden />
				</Button>
				{phase.kind === "active" ? (
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
							<DropdownMenuItem onClick={() => setStartOverOpen(true)}>
								<RotateCcw aria-hidden />
								Start over
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</header>

			<div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_25rem]">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<main className="min-h-0 flex-1 overflow-y-auto">
						<div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-6">
							{phase.kind === "setup" ? (
								<>
									<div className="flex flex-col items-center gap-2 text-center">
										<p className="font-heading font-semibold text-7xl text-muted-foreground/40 tabular-nums leading-none tracking-tight sm:text-8xl">
											00:00
										</p>
										<p className="text-muted-foreground text-sm">
											A timer for anything, without a book
										</p>
									</div>
									<div className="flex w-full flex-col gap-1.5">
										<label htmlFor="free-label" className="font-medium text-sm">
											What is it for?
										</label>
										<Input
											id="free-label"
											value={label}
											maxLength={LABEL_MAX}
											placeholder="Studying, writing, a pomodoro…"
											className="h-11"
											onChange={(event) => setLabel(event.target.value)}
										/>
									</div>
									<ModeSetup
										prefs={prefs}
										onChange={changePrefs}
										busy={session.busy}
										onStart={(next) =>
											void session
												.begin(next, label.trim() || null)
												.catch((error: unknown) => fail(error))
										}
									/>
								</>
							) : null}

							{active && clock && config ? (
								<ClockHero
									clock={clock}
									config={config}
									notice={session.notice}
									canKeepReading={canKeepReading}
									onKeepReading={() => session.keepReading()}
									onDismissNotice={() => session.dismissNotice()}
								/>
							) : null}

							{phase.kind === "ended" ? (
								<SessionSummary
									free
									summary={phase.summary}
									seconds={phase.seconds}
									notice={phase.notice}
									byPage={false}
									bookTitle={label.trim() || null}
									onAgain={() => session.backToSetup()}
									onDone={goBack}
								/>
							) : null}

							{!wide && phase.kind !== "ended" ? (
								<div className="flex w-full flex-col gap-3">
									{pages}
									{player}
									{soundsOpen ? <SoundsPanel sounds={sounds} /> : null}
								</div>
							) : null}
						</div>
					</main>

					{active && clock ? (
						<Dock
							status={clock.status}
							canKeepReading={canKeepReading}
							isBreak={isBreak}
							soundsPlaying={sounds.anyPlaying}
							soundsOpen={soundsOpen}
							showSoundsButton={!wide}
							onPause={() => session.pause()}
							onResume={() => void session.resume()}
							onKeepReading={() => session.keepReading()}
							onFinishSession={() => setFinishSessionOpen(true)}
							onSkipBreak={() => session.skip()}
							onToggleSounds={() => setSoundsOpen((open) => !open)}
						/>
					) : null}

					{phase.kind === "setup" && !wide ? (
						<div
							className="border-border border-t bg-background px-4 pt-3"
							style={{
								paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
							}}
						>
							<Button
								type="button"
								variant="outline"
								className="h-12 w-full"
								aria-pressed={soundsOpen}
								onClick={() => setSoundsOpen((open) => !open)}
							>
								{soundsOpen ? "Hide sounds" : "Sounds"}
							</Button>
						</div>
					) : null}
				</div>

				{wide ? (
					<aside
						aria-label="Sounds"
						className="flex min-h-0 flex-col gap-3 overflow-y-auto border-border border-l p-4"
					>
						{phase.kind !== "ended" ? pages : null}
						{player}
						<SoundsPanel sounds={sounds} />
					</aside>
				) : null}
			</div>

			<AlertDialog open={phase.kind === "takeover"}>
				<AlertDialogContent>
					<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
						<AlertDialogTitle>A session is already open</AlertDialogTitle>
						<AlertDialogDescription>
							{phase.kind === "takeover"
								? `A session with ${formatDuration(phase.session.activeSeconds)} is running on another device or tab. You can carry it on here, or start a new one.`
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
				description={`Leaving ends the session and saves ${formatDuration(session.secondsNow())}.`}
				confirmLabel="End and leave"
				onConfirm={() => void endAndLeave()}
			/>
			<ConfirmDialog
				open={finishSessionOpen}
				onOpenChange={setFinishSessionOpen}
				title="Finish this session?"
				description={`This saves ${formatDuration(session.secondsNow())}.`}
				confirmLabel="Finish session"
				onConfirm={() => void session.finish().catch(fail)}
			/>
			<ConfirmDialog
				open={startOverOpen}
				onOpenChange={setStartOverOpen}
				title="Start over?"
				description={`This saves the ${formatDuration(session.secondsNow())} so far and gives you a fresh timer.`}
				confirmLabel="Save and start over"
				onConfirm={() => {
					void session
						.finish()
						.then(() => session.backToSetup())
						.catch(fail);
				}}
			/>
		</div>
	);
}

function sessionIdOf(
	session: ReturnType<typeof useReadingSession>,
): string | null {
	return session.sessionId();
}
