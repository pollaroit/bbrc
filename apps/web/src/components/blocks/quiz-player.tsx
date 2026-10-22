"use client";

import type { QuizPlayQuestion } from "@bbrc/api/modules/quiz/quiz.schema";
import { QUIZ_SCORING } from "@bbrc/api/modules/quiz/quiz-scoring";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Loader2,
	Timer,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const QUESTION_COUNT = QUIZ_SCORING.length;
const POLL_MS = 3000;
const SKIPPED = -1;

type PlayerBook = {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

type Draft = { answers: number[]; visited: number[]; step: number };

type Phase =
	| { kind: "starting" }
	| { kind: "playing"; questions: QuizPlayQuestion[]; expiresAt: Date }
	| { kind: "unavailable"; until: Date | null }
	| {
			kind: "limit";
			reason: "first_time" | "failures";
			limit: number;
			resetsAt: Date;
	  }
	| { kind: "error"; message: string };

function draftKey(userId: string, slug: string) {
	return `bbrc:quiz:${userId}:${slug}`;
}

function readDraft(key: string): Draft | null {
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as Draft;
		if (
			Array.isArray(parsed.answers) &&
			parsed.answers.length === QUESTION_COUNT &&
			Array.isArray(parsed.visited)
		) {
			return parsed;
		}
	} catch {
		// Storage can be blocked; the quiz still works without a draft.
	}
	return null;
}

function writeDraft(key: string, draft: Draft | null) {
	try {
		if (draft) {
			window.localStorage.setItem(key, JSON.stringify(draft));
		} else {
			window.localStorage.removeItem(key);
		}
	} catch {
		// ignore
	}
}

function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function useCountdown(expiresAt: Date | null) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!expiresAt) {
			return;
		}
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [expiresAt]);
	return expiresAt ? expiresAt.getTime() - now : null;
}

export function QuizPlayer({
	book,
	userId,
}: {
	book: PlayerBook;
	userId: string;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const key = draftKey(userId, book.slug);
	const [phase, setPhase] = useState<Phase>({ kind: "starting" });
	const [answers, setAnswers] = useState<number[]>(() =>
		Array.from({ length: QUESTION_COUNT }, () => SKIPPED),
	);
	const [visited, setVisited] = useState<number[]>([0]);
	const [step, setStep] = useState(0);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const startedRef = useRef(false);
	const mountedRef = useRef(false);
	const submittedRef = useRef(false);

	const startMutation = useMutation(orpc.quiz.start.mutationOptions());
	const submitMutation = useMutation(orpc.quiz.submit.mutationOptions());

	const goToResults = useCallback(() => {
		submittedRef.current = true;
		writeDraft(key, null);
		void queryClient.invalidateQueries({
			queryKey: orpc.quiz.getEntryState.key(),
		});
		router.replace(`/books/${book.slug}/quiz/results` as Route);
		router.refresh();
	}, [book.slug, key, queryClient, router]);

	// Open (or resume) the attempt; poll while someone is generating the quiz.
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once per mount
	useEffect(() => {
		if (startedRef.current) {
			return;
		}
		startedRef.current = true;
		const attempt = async () => {
			try {
				const result = await startMutation.mutateAsync({ slug: book.slug });
				if (!mountedRef.current) {
					return;
				}
				if (result.status === "generating") {
					window.setTimeout(attempt, POLL_MS);
					return;
				}
				if (result.status === "finished") {
					goToResults();
					return;
				}
				if (result.status === "ready") {
					const draft = readDraft(key);
					if (draft) {
						setAnswers(draft.answers);
						setVisited(draft.visited);
						setStep(Math.min(Math.max(draft.step, 0), QUESTION_COUNT - 1));
					}
					setPhase({
						kind: "playing",
						questions: result.questions,
						expiresAt: result.expiresAt,
					});
					return;
				}
				if (result.status === "unavailable") {
					setPhase({ kind: "unavailable", until: result.until });
					return;
				}
				setPhase({
					kind: "limit",
					reason: result.reason,
					limit: result.limit,
					resetsAt: result.resetsAt,
				});
			} catch (error) {
				if (mountedRef.current) {
					setPhase({
						kind: "error",
						message:
							error instanceof Error
								? error.message
								: "Could not load the quiz.",
					});
				}
			}
		};

		void attempt();
	}, []);

	// Strict Mode mounts, unmounts and remounts in dev: track the live mount
	// instead of cancelling the first request, whose reply we still need.
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const playing = phase.kind === "playing";

	// Persist the draft so a reload resumes where the reader left off.
	useEffect(() => {
		if (playing && !submittedRef.current) {
			writeDraft(key, { answers, visited, step });
		}
	}, [answers, visited, step, playing, key]);

	// Leaving mid-quiz uses up the attempt: warn before the tab closes.
	useEffect(() => {
		if (!playing) {
			return;
		}
		const handler = (event: BeforeUnloadEvent) => {
			if (submittedRef.current) {
				return;
			}
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [playing]);

	const expiresAt = phase.kind === "playing" ? phase.expiresAt : null;
	const remaining = useCountdown(expiresAt);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only react to expiry
	useEffect(() => {
		if (remaining != null && remaining <= 0 && !submittedRef.current) {
			toast.error("Time is up. Your attempt was closed.");
			goToResults();
		}
	}, [remaining != null && remaining <= 0]);

	function goTo(next: number) {
		const clamped = Math.min(Math.max(next, 0), QUESTION_COUNT - 1);
		setStep(clamped);
		setVisited((current) =>
			current.includes(clamped) ? current : [...current, clamped],
		);
	}

	function choose(index: number) {
		setAnswers((current) =>
			current.map((value, position) => (position === step ? index : value)),
		);
	}

	async function submit() {
		try {
			const result = await submitMutation.mutateAsync({
				slug: book.slug,
				answers,
			});
			if (result.status === "forfeited") {
				toast.error("Time ran out before you submitted.");
			}
			goToResults();
		} catch (error) {
			setConfirmOpen(false);
			toast.error(
				error instanceof Error
					? error.message
					: "Could not submit your answers.",
			);
		}
	}

	const coverSrc = bookCoverUrl(book.coverId, "M");

	const header = (
		<header className="flex items-center gap-3 border border-border p-3 sm:p-4">
			<div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-12">
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="48px"
					/>
				) : null}
			</div>
			<div className="min-w-0 flex-1">
				<h1 className="truncate font-semibold text-base tracking-tight sm:text-lg">
					{book.title}
				</h1>
				<p className="truncate text-muted-foreground text-xs">
					{formatBookAuthors(book.authors)} · Reading quiz
				</p>
			</div>
			{remaining != null ? (
				<div
					className={cn(
						"inline-flex shrink-0 items-center gap-1.5 border border-border px-2.5 py-1.5 font-medium text-sm tabular-nums",
						remaining < 120_000 &&
							"border-destructive/60 bg-destructive/10 text-destructive",
					)}
					role="timer"
					aria-label="Time left"
				>
					<Timer className="size-4" aria-hidden />
					{formatRemaining(remaining)}
				</div>
			) : null}
		</header>
	);

	if (phase.kind === "starting") {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<div
					className="flex flex-col items-center gap-3 border border-border border-dashed px-4 py-16 text-center"
					aria-live="polite"
				>
					<Loader2
						className="size-6 animate-spin text-muted-foreground"
						aria-hidden
					/>
					<p className="font-medium text-sm">Generating questions…</p>
					<p className="max-w-sm text-muted-foreground text-xs">
						The first reader of a book waits while the quiz is written. It can
						take up to half a minute. Keep this tab open.
					</p>
				</div>
			</div>
		);
	}

	if (phase.kind === "unavailable") {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<Notice
					title="No quiz for this book yet"
					body={
						phase.until
							? `We couldn't write a reliable quiz for this book. It can be tried again after ${formatDateTime(phase.until)}.`
							: "We couldn't write a reliable quiz for this book."
					}
					bookSlug={book.slug}
				/>
			</div>
		);
	}

	if (phase.kind === "limit") {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<Notice
					title={
						phase.reason === "first_time"
							? "No new quizzes left today"
							: "Too many failed attempts today"
					}
					body={
						phase.reason === "first_time"
							? `You can start ${phase.limit} brand-new quizzes a day. Quizzes other readers already started don't count, so you can still take those. The limit resets ${formatDateTime(phase.resetsAt)}.`
							: `Generating a quiz failed ${phase.limit} times today. Try again after ${formatDateTime(phase.resetsAt)}.`
					}
					bookSlug={book.slug}
				/>
			</div>
		);
	}

	if (phase.kind === "error") {
		return (
			<div className="flex flex-col gap-4">
				{header}
				<Notice
					title="Couldn't load the quiz"
					body={phase.message}
					bookSlug={book.slug}
					retry
				/>
			</div>
		);
	}

	if (phase.kind !== "playing") {
		return null;
	}

	const question = phase.questions[step];
	if (!question) {
		return null;
	}
	const scoring = QUIZ_SCORING[step];
	const answeredCount = answers.filter((value) => value !== SKIPPED).length;
	const unvisitedCount = Array.from(
		{ length: QUESTION_COUNT },
		(_, index) => index,
	).filter((index) => !visited.includes(index)).length;
	const skippedCount = QUESTION_COUNT - answeredCount - unvisitedCount;
	const isLast = step === QUESTION_COUNT - 1;
	const letters = ["A", "B", "C", "D"];

	return (
		<div className="flex flex-col gap-4">
			{header}

			<div
				className="flex items-start gap-2 border border-amber-600/40 bg-amber-50 px-3 py-2 text-amber-950 text-xs dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
				role="note"
			>
				<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
				<p>
					Don't close or reload this tab. You get one attempt per book, and
					leaving counts as your attempt. Your answers are only checked when you
					submit.
				</p>
			</div>

			<nav aria-label="Questions" className="grid grid-cols-5 gap-1.5">
				{Array.from({ length: QUESTION_COUNT }, (_, index) => {
					const answered = answers[index] !== SKIPPED;
					const seen = visited.includes(index);
					return (
						<button
							key={index}
							type="button"
							onClick={() => goTo(index)}
							aria-current={index === step ? "step" : undefined}
							className={cn(
								"flex flex-col items-center gap-0.5 border px-1 py-2 text-xs transition-colors",
								index === step
									? "border-foreground bg-foreground text-background"
									: answered
										? "border-primary/60 bg-primary/10"
										: seen
											? "border-border bg-muted/40 text-muted-foreground"
											: "border-border border-dashed text-muted-foreground",
							)}
						>
							<span className="font-semibold text-sm tabular-nums">
								{index + 1}
							</span>
							<span className="hidden sm:block">
								{index === step
									? "Now"
									: answered
										? "Answered"
										: seen
											? "Skipped"
											: "Not seen"}
							</span>
						</button>
					);
				})}
			</nav>

			<section
				className="flex flex-col gap-4 border border-border p-4 sm:p-5"
				aria-labelledby="quiz-question"
			>
				<div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
					<span>
						Question {step + 1} of {QUESTION_COUNT} · {scoring?.label}
					</span>
					<span className="tabular-nums">
						+{scoring?.correct} right · {scoring?.wrong} wrong · 0 skipped
					</span>
				</div>
				<h2
					id="quiz-question"
					className="font-medium text-base leading-relaxed sm:text-lg"
				>
					{question.question}
				</h2>
				<fieldset className="flex flex-col gap-2">
					<legend className="sr-only">Choose one answer</legend>
					{question.choices.map((choice, index) => {
						const selected = answers[step] === index;
						return (
							<label
								key={choice}
								className={cn(
									"flex cursor-pointer items-start gap-3 border border-border p-3 transition-colors hover:bg-muted/40 has-focus-visible:ring-2 has-focus-visible:ring-ring",
									selected && "border-primary bg-primary/10",
								)}
							>
								<input
									type="radio"
									name={`question-${question.position}`}
									className="sr-only"
									checked={selected}
									onChange={() => choose(index)}
								/>
								<span
									className={cn(
										"inline-flex size-6 shrink-0 items-center justify-center border border-border font-semibold text-xs",
										selected &&
											"border-primary bg-primary text-primary-foreground",
									)}
									aria-hidden
								>
									{letters[index]}
								</span>
								<span className="text-sm leading-snug">{choice}</span>
							</label>
						);
					})}
				</fieldset>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							choose(SKIPPED);
							if (!isLast) {
								goTo(step + 1);
							}
						}}
					>
						Skip this question
					</Button>
					{answers[step] !== SKIPPED ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => choose(SKIPPED)}
						>
							Clear answer
						</Button>
					) : null}
				</div>
			</section>

			<div className="flex items-center justify-between gap-3">
				<Button
					type="button"
					variant="outline"
					disabled={step === 0}
					onClick={() => goTo(step - 1)}
				>
					<ArrowLeft data-icon="inline-start" />
					Back
				</Button>
				{isLast ? (
					<Button type="button" onClick={() => setConfirmOpen(true)}>
						Submit answers
					</Button>
				) : (
					<Button type="button" onClick={() => goTo(step + 1)}>
						Next
						<ArrowRight data-icon="inline-end" />
					</Button>
				)}
			</div>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Submit your answers?</AlertDialogTitle>
						<AlertDialogDescription>
							{answeredCount} answered, {skippedCount} skipped, {unvisitedCount}{" "}
							not seen. You can't change them after submitting, and skipped
							questions score nothing.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={submitMutation.isPending}>
							Keep answering
						</AlertDialogCancel>
						<LoadingButton
							type="button"
							loading={submitMutation.isPending}
							onClick={() => {
								void submit();
							}}
						>
							Submit
						</LoadingButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function Notice({
	title,
	body,
	bookSlug,
	retry,
}: {
	title: string;
	body: string;
	bookSlug: string;
	retry?: boolean;
}) {
	const router = useRouter();
	return (
		<div className="flex flex-col items-start gap-3 border border-border border-dashed p-5">
			<div className="flex flex-col gap-1">
				<p className="font-medium text-sm">{title}</p>
				<p className="max-w-prose text-muted-foreground text-sm">{body}</p>
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					nativeButton={false}
					render={<Link href={`/books/${bookSlug}` as Route} />}
				>
					Back to book
				</Button>
				{retry ? (
					<Button size="sm" onClick={() => router.refresh()}>
						Try again
					</Button>
				) : null}
			</div>
		</div>
	);
}
