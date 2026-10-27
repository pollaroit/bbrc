"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { QuizPager } from "@/components/blocks/quiz-pager";
import {
	QuizCounts,
	QuizRank,
	QuizScore,
} from "@/components/blocks/quiz-score-parts";
import { UserPanel } from "@/components/blocks/user-panel";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import {
	quizSortFields,
	quizSortLabels,
	useQuizListingSearchParams,
} from "@/lib/listing/quiz-listing";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

export function BookQuizzesList({ bookSlug }: { bookSlug: string }) {
	const [params, setParams] = useQuizListingSearchParams();

	const options = orpc.quiz.listForBook.queryOptions({
		input: {
			slug: bookSlug,
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
					placeholder="Search by name or username…"
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
					{Array.from({ length: 5 }, (_, index) => (
						<Skeleton key={index} className="h-16 w-full" />
					))}
				</div>
			) : query.isError ? (
				<p className="text-destructive text-sm">Could not load quiz scores.</p>
			) : query.data.items.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
					{params.search
						? "No one matches that search."
						: "No one has finished this quiz yet."}
				</p>
			) : (
				<>
					<ul className="flex flex-col divide-y divide-border border border-border">
						{query.data.items.map((row) => (
							<li
								key={row.user.username}
								className="flex items-center gap-3 px-3 py-3 sm:px-4"
							>
								<QuizRank rank={row.rank} />
								<Link
									href={`/users/${row.user.username}` as Route}
									className="min-w-0 flex-1 hover:underline"
								>
									<UserPanel
										user={row.user}
										renderDescription={(user) => `@${user.username}`}
									/>
								</Link>
								<div className="flex shrink-0 flex-col items-end gap-0.5">
									<QuizScore score={row.score} />
									<QuizCounts
										correct={row.correct}
										incorrect={row.incorrect}
										skipped={row.skipped}
									/>
								</div>
								<span className="hidden w-32 shrink-0 text-right text-muted-foreground text-xs sm:block">
									{formatDateTime(row.submittedAt)}
								</span>
							</li>
						))}
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
		</div>
	);
}
