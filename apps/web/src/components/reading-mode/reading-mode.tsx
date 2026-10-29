"use client";

import {
	formatDuration,
	plainTextToRichDocument,
	serializeRichDocument,
	TIMER_MAX_READING_MS,
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
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	ArrowLeft,
	BookCheck,
	Moon,
	MoreHorizontal,
	RotateCcw,
	Trash2,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { ClockHero } from "@/components/reading-mode/clock-hero";
import { ConfirmDialog } from "@/components/reading-mode/confirm-dialog";
import { Dock } from "@/components/reading-mode/dock";
import { ModeSetup } from "@/components/reading-mode/mode-setup";
import { NowPlaying } from "@/components/reading-mode/now-playing";
import { PresenceLine } from "@/components/reading-mode/presence-line";
import { SessionSummary } from "@/components/reading-mode/session-summary";
import { SoundsPanel } from "@/components/reading-mode/sounds-panel";
import { useSounds } from "@/components/reading-mode/use-sounds";
import { WhereYouAre } from "@/components/reading-mode/where-you-are";
import { useAbandonReading, useReadingState } from "@/lib/reading/use-reading";
import {
	DEFAULT_MODE_PREFS,
	loadModePrefs,
	type ModePrefs,
	saveModePrefs,
} from "@/lib/reading-mode/storage";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { useReadingSession } from "@/lib/reading-mode/use-reading-session";
import { useWakeLock } from "@/lib/reading-mode/use-wake-lock";

// The finish dialog carries the editor and the review form, so it loads when asked.
const BookMarkReadDialog = dynamic(
	() =>
		import("@/components/blocks/book-mark-read-dialog").then(
			(mod) => mod.BookMarkReadDialog,
		),
	{ ssr: false },
);

/**
 * Reading Mode: a calm, full-screen companion while you read. One big clock,
 * the page you are on, sounds if you want them, and nothing else. On a phone it
 * is a single column with the controls under your thumb; on a wide screen the
 * book and the sounds sit beside the clock.
 */
export function ReadingMode({ bookSlug }: { bookSlug: string }) {
	const router = useRouter();
	const state = useReadingState(bookSlug);
	const reading = state.data?.reading ?? null;
	const abandon = useAbandonReading();
	const { openCompose } = useComposePost();
	const sounds = useSounds();
	const wide = useMediaQuery("(min-width: 1024px)");

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

	if (!reading) {
		return (
			<main className="grid h-dvh place-items-center bg-background p-6">
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

	const byPage = reading.totalPages != null && reading.currentPage != null;
	const config = timer?.config;
	const active = phase.kind === "active" && clock != null && config != null;
	const canKeepReading = (clock?.readMs ?? 0) < TIMER_MAX_READING_MS;
	const isBreak = clock?.phase === "break";

	const book = <WhereYouAre reading={reading} />;
	const player = sounds.station ? <NowPlaying sounds={sounds} /> : null;

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
					onClick={requestLeave}
					aria-label="Leave Reading Mode"
				>
					<ArrowLeft aria-hidden />
				</Button>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm leading-tight">
						{reading.book.title}
					</p>
					<p className="truncate text-muted-foreground text-xs">
						{reading.book.authors.join(", ")}
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
						{phase.kind === "active" ? (
							<DropdownMenuItem onClick={() => setStartOverOpen(true)}>
								<RotateCcw aria-hidden />
								Start over
							</DropdownMenuItem>
						) : null}
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
						<DropdownMenuSeparator />
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

			<div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_25rem]">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<main className="min-h-0 flex-1 overflow-y-auto">
						{/* The clock sits in the middle when there is room. */}
						<div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-6">
							{phase.kind === "setup" ? (
								<>
									<div className="flex flex-col items-center gap-2 text-center">
										<p className="font-heading font-semibold text-7xl text-muted-foreground/40 tabular-nums leading-none tracking-tight sm:text-8xl">
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
											void session
												.begin(next)
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
									summary={phase.summary}
									seconds={phase.seconds}
									notice={phase.notice}
									byPage={byPage}
									bookTitle={reading.book.title}
									onShare={() => {
										const gained =
											phase.summary &&
											phase.summary.pageFrom != null &&
											phase.summary.pageTo != null
												? phase.summary.pageTo - phase.summary.pageFrom
												: 0;
										const text = `Read ${reading.book.title} for ${formatDuration(phase.seconds)}${
											gained > 0 ? ` (${gained} pages)` : ""
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

							{phase.kind !== "ended" ? (
								<PresenceLine bookSlug={bookSlug} refresh />
							) : null}

							{/* On a phone the book, the music and the sounds sit under the clock. */}
							{!wide && phase.kind !== "ended" ? (
								<div className="flex w-full flex-col gap-3">
									{book}
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
						aria-label="Book and sounds"
						className="flex min-h-0 flex-col gap-3 overflow-y-auto border-border border-l p-4"
					>
						{phase.kind !== "ended" ? book : null}
						{player}
						<SoundsPanel sounds={sounds} />
					</aside>
				) : null}
			</div>

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
