"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { deckButtonClass, deckLabelClass } from "@/lib/book-deck";
import { BOOK_TONES } from "@/lib/book-tones";
import { orpc } from "@/utils/orpc";

/** Quiz entry beside Mark read: the label follows the viewer's quiz state. */
export function BookQuizButton({
	bookSlug,
	deck = false,
}: {
	bookSlug: string;
	/** The tinted button of the book page's action dock: no captions or score link. */
	deck?: boolean;
}) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const query = useQuery({
		...orpc.quiz.getEntryState.queryOptions({ input: { slug: bookSlug } }),
		enabled: !sessionPending,
	});

	const data = query.data;
	if (!data) {
		return null;
	}

	const quizzesLink =
		data.submissionCount > 0 && !deck ? (
			<Link
				href={`/books/${bookSlug}/quizzes` as Route}
				className="text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				Quiz scores ({data.submissionCount})
			</Link>
		) : null;

	if (
		!session?.user ||
		data.state === "signed_out" ||
		data.state === "not_read"
	) {
		return quizzesLink;
	}

	const buttonClass = deck ? deckButtonClass : undefined;
	const variant = deck ? "ghost" : "outline";
	const iconClass = deck ? BOOK_TONES.warning.ink : undefined;
	const quizHref = `/books/${bookSlug}/quiz` as Route;
	const resultsHref = `/books/${bookSlug}/quiz/results` as Route;

	const caption = (full: string, short: string) =>
		deck ? <span className={deckLabelClass}>{short}</span> : full;

	return (
		<div
			className={
				deck ? "contents" : "flex min-w-0 flex-col items-start gap-1.5"
			}
		>
			{data.state === "submitted" || data.state === "forfeited" ? (
				<Button
					variant={variant}
					className={buttonClass}
					aria-label="Quiz results"
					nativeButton={false}
					render={<Link href={resultsHref} />}
				>
					<Trophy data-icon="inline-start" className={iconClass} />
					{caption("Quiz results", "Results")}
				</Button>
			) : data.state === "unavailable" ? (
				<Button
					variant={variant}
					className={buttonClass}
					aria-label="Quiz unavailable"
					disabled
				>
					<ListChecks data-icon="inline-start" className={iconClass} />
					{caption("Quiz unavailable", "Quiz")}
				</Button>
			) : (
				<Button
					variant={variant}
					className={buttonClass}
					aria-label={
						data.state === "in_progress" ? "Continue quiz" : "Take quiz"
					}
					nativeButton={false}
					render={<Link href={quizHref} />}
				>
					<ListChecks data-icon="inline-start" className={iconClass} />
					{data.state === "in_progress"
						? caption("Continue quiz", "Resume quiz")
						: caption("Take quiz", "Quiz")}
				</Button>
			)}
			{data.state === "can_start" && !data.quizReady && !deck ? (
				<p className="text-muted-foreground text-xs">
					{data.firstTimeLeftToday === 0
						? "No new quizzes left today"
						: `You can start ${data.firstTimeLeftToday} new ${data.firstTimeLeftToday === 1 ? "quiz" : "quizzes"} today`}
				</p>
			) : null}
			{quizzesLink}
		</div>
	);
}
