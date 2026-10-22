import { getQuizEntryState } from "@bbrc/api/modules/quiz/quiz.service";
import { ORPCError } from "@orpc/server";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { QuizPlayer } from "@/components/blocks/quiz-player";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth, db } from "@/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Book quiz",
	robots: NO_INDEX_ROBOTS,
};

export default async function BookQuizPage({
	params,
}: PageProps<"/books/[slug]/quiz">) {
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

	if (state === "submitted" || state === "forfeited") {
		redirect(`/books/${slug}/quiz/results` as Route);
	}
	if (state === "signed_out" || state === "not_read") {
		redirect(`/books/${slug}` as Route);
	}

	const book = await db.book.findUnique({
		where: { slug },
		select: { slug: true, title: true, authors: true, coverId: true },
	});
	if (!book) {
		notFound();
	}

	return (
		<div className="mx-auto w-full max-w-2xl">
			<QuizPlayer book={book} userId={session.user.id} />
		</div>
	);
}
