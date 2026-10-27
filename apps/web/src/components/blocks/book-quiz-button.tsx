"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Trophy } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/** Quiz entry under the cover: the label follows the viewer's quiz state. */
export function BookQuizButton({ bookSlug }: { bookSlug: string }) {
	const t = useTranslations("books");
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
		data.submissionCount > 0 ? (
			<Link
				href={`/books/${bookSlug}/quizzes` as Route}
				className="text-center text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
			>
				{t("quiz.scores", { count: data.submissionCount })}
			</Link>
		) : null;

	if (
		!session?.user ||
		data.state === "signed_out" ||
		data.state === "not_read"
	) {
		return quizzesLink;
	}

	const quizHref = `/books/${bookSlug}/quiz` as Route;
	const resultsHref = `/books/${bookSlug}/quiz/results` as Route;

	return (
		<div className="flex flex-col gap-1.5">
			{data.state === "submitted" || data.state === "forfeited" ? (
				<Button
					variant="secondary"
					className="w-full"
					nativeButton={false}
					render={<Link href={resultsHref} />}
				>
					<Trophy data-icon="inline-start" />
					{t("quiz.results")}
				</Button>
			) : data.state === "unavailable" ? (
				<Button variant="outline" className="w-full" disabled>
					<ListChecks data-icon="inline-start" />
					{t("quiz.unavailable")}
				</Button>
			) : (
				<Button
					className="w-full"
					nativeButton={false}
					render={<Link href={quizHref} />}
				>
					<ListChecks data-icon="inline-start" />
					{data.state === "in_progress" ? t("quiz.continue") : t("quiz.take")}
				</Button>
			)}
			{data.state === "can_start" && !data.quizReady ? (
				<p className="text-center text-muted-foreground text-xs">
					{data.firstTimeLeftToday === 0
						? t("quiz.noneLeftToday")
						: t("quiz.leftToday", { count: data.firstTimeLeftToday ?? 0 })}
				</p>
			) : null}
			{quizzesLink}
		</div>
	);
}
