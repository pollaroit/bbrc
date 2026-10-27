import { getQuizEntryState } from "@bbrc/api/modules/quiz/quiz.service";
import { ORPCError } from "@orpc/server";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { QuizResultsView } from "@/components/blocks/quiz-results-view";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth, db } from "@/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Quiz results",
	robots: NO_INDEX_ROBOTS,
};

export default async function BookQuizResultsPage({
	params,
}: PageProps<"/[locale]/books/[slug]/quiz/results">) {
	const { slug } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) {
		redirect(`/books/${slug}` as Route);
	}

	let state: Awaited<ReturnType<typeof getQuizEntryState>>["state"];
	try {
		({ state } = await getQuizEntryState(slug, db, session));
	} catch (error) {
		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			notFound();
		}
		throw error;
	}

	if (state === "in_progress" || state === "can_start") {
		redirect(`/books/${slug}/quiz` as Route);
	}
	if (state !== "submitted" && state !== "forfeited") {
		redirect(`/books/${slug}` as Route);
	}

	return (
		<div className="mx-auto w-full max-w-3xl">
			<QuizResultsView slug={slug} />
		</div>
	);
}
