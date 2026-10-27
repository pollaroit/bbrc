"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import { useState } from "react";
import { QuizPager } from "@/components/blocks/quiz-pager";
import { QuizReviewList } from "@/components/blocks/quiz-results-view";
import { QuizCounts, QuizScore } from "@/components/blocks/quiz-score-parts";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import {
	quizSortFields,
	quizSortLabels,
	useQuizListingSearchParams,
} from "@/lib/listing/quiz-listing";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 12;

function ReviewDialog({
	username,
	slug,
	onClose,
}: {
	username: string;
	slug: string | null;
	onClose: () => void;
}) {
	const options = orpc.quiz.getReview.queryOptions({
		input: { username, slug: slug ?? "" },
	});
	const query = useQuery({ ...options, enabled: slug != null });

	return (
		<Dialog
			open={slug != null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{query.data?.book.title ?? "Quiz replay"}</DialogTitle>
					<DialogDescription>
						{query.data
							? `Scored ${query.data.score}. Your picks are marked.`
							: "Loading your answers…"}
					</DialogDescription>
				</DialogHeader>
				{query.isPending ? (
					<Skeleton className="h-48 w-full" />
				) : query.isError ? (
					<p className="text-destructive text-sm">{query.error.message}</p>
				) : (
					<QuizReviewList questions={query.data.questions} />
				)}
			</DialogContent>
		</Dialog>
	);
}

export function UserQuizzesList({ username }: { username: string }) {
	const [params, setParams] = useQuizListingSearchParams();
	const [reviewSlug, setReviewSlug] = useState<string | null>(null);

	const options = orpc.quiz.listForUser.queryOptions({
		input: {
			username,
			page: params.page,
			limit: PAGE_SIZE,
			search: params.search ?? undefined,
			sortBy: params.sortBy,
			sortDirection: params.sortDirection,
		},
	});
	const query = useQuery({
		...options,
		placeholderData: (previous) => previous,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search, page: 1 });
					}}
					placeholder="Search by book…"
				/>
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy: sortBy ?? "submittedAt", page: 1 });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection: sortDirection ?? "desc", page: 1 });
					}}
					sortByOptions={quizSortFields}
					sortByLabels={quizSortLabels}
					appearance="library"
				/>
			</div>

			{query.isPending ? (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-24 w-full" />
					))}
				</div>
			) : query.isError ? (
				<p className="text-destructive text-sm">Could not load quizzes.</p>
			) : query.data.items.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
					{params.search
						? "No quizzes match that search."
						: "No quizzes taken yet."}
				</p>
			) : (
				<>
					<ul className="grid gap-3 sm:grid-cols-2">
						{query.data.items.map((row) => {
							const coverSrc = bookCoverUrl(row.book.coverId, "M");
							const submitted = row.status === "submitted";
							return (
								<li
									key={row.id}
									className="flex gap-3 border border-border p-3"
								>
									<Link
										href={`/books/${row.book.slug}` as Route}
										className="relative aspect-2/3 w-14 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10"
									>
										{coverSrc ? (
											<Image
												src={coverSrc}
												alt=""
												fill
												className="object-cover"
												sizes="56px"
											/>
										) : null}
									</Link>
									<div className="flex min-w-0 flex-1 flex-col gap-1.5">
										<div className="min-w-0">
											<Link
												href={`/books/${row.book.slug}` as Route}
												className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
											>
												{row.book.title}
											</Link>
											<p className="truncate text-muted-foreground text-xs">
												{formatBookAuthors(row.book.authors)}
											</p>
										</div>
										{submitted && row.score != null ? (
											<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
												<QuizScore score={row.score} />
												<QuizCounts
													correct={row.correct}
													incorrect={row.incorrect}
													skipped={row.skipped}
												/>
											</div>
										) : (
											<div>
												<Badge variant="outline">Abandoned</Badge>
											</div>
										)}
										<div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
											<span>
												{submitted && row.rank != null
													? `#${row.rank} of ${row.participantCount} · `
													: ""}
												{formatDateTime(row.submittedAt ?? row.startedAt)}
											</span>
											{query.data.canReview && submitted ? (
												<Button
													type="button"
													variant="outline"
													size="xs"
													onClick={() => setReviewSlug(row.book.slug)}
												>
													Review
												</Button>
											) : null}
										</div>
									</div>
								</li>
							);
						})}
					</ul>
					<QuizPager
						page={query.data.metadata.page}
						totalPages={query.data.metadata.totalPages}
						total={query.data.metadata.total}
						onPageChange={(page) => {
							void setParams({ page });
						}}
					/>
				</>
			)}

			<ReviewDialog
				username={username}
				slug={reviewSlug}
				onClose={() => setReviewSlug(null)}
			/>
		</div>
	);
}
