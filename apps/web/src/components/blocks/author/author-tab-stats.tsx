"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { InsightsBookCover } from "@/components/blocks/author/author-insights-covers";
import {
	describeRange,
	InsightsClearButton,
	InsightsFilterRow,
	InsightsMultiPicker,
	InsightsRangePicker,
	rangeToQuery,
} from "@/components/blocks/author/author-insights-filters";
import { AuthorStatsCards } from "@/components/blocks/author/author-stats-cards";
import {
	ActivityChart,
	BooksChart,
	CountriesChart,
	DecadesChart,
	FunnelDonut,
	GrowthChart,
	LeaderboardList,
	PagesChart,
	RatingDistributionChart,
	RatingOverTimeChart,
	ReadingTimeChart,
	SeasonChart,
	type StatsChartActions,
	SubjectsChart,
	TimelineChart,
	YearsChart,
} from "@/components/blocks/author/author-stats-charts";
import { StatsSkeleton } from "@/components/blocks/author/author-stats-frame";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function toggle(list: string[], value: string) {
	return list.includes(value)
		? list.filter((item) => item !== value)
		: [...list, value];
}

export function AuthorTabStats({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [filters, setFilters] = useQueryStates(
		{
			books: parseAsArrayOf(parseAsString).withDefault([]),
			readers: parseAsArrayOf(parseAsString).withDefault([]),
			from: parseAsString,
			to: parseAsString,
		},
		{ clearOnDefault: true },
	);

	const [bookQuery, setBookQuery] = useState("");
	const [readerQuery, setReaderQuery] = useState("");
	const debouncedBookQuery = useDebouncedValue(bookQuery, 250);
	const debouncedReaderQuery = useDebouncedValue(readerQuery, 250);

	const bookOptions = useQuery(
		orpc.author.bookOptions.queryOptions({
			input: { slug, query: debouncedBookQuery },
			placeholderData: (previous) => previous,
		}),
	);
	const readerOptions = useQuery(
		orpc.author.readerOptions.queryOptions({
			input: { slug, query: debouncedReaderQuery, source: "reads" },
			placeholderData: (previous) => previous,
		}),
	);

	const input = useMemo(
		() => ({
			slug,
			...(filters.books.length > 0 ? { bookSlugs: filters.books } : {}),
			...(filters.readers.length > 0
				? { readerUsernames: filters.readers }
				: {}),
			...rangeToQuery({ from: filters.from, to: filters.to }),
		}),
		[slug, filters],
	);

	const query = useQuery(
		orpc.authorInsights.stats.queryOptions({
			input,
			placeholderData: (previous) => previous,
		}),
	);

	const narrowed =
		filters.books.length > 0 ||
		filters.readers.length > 0 ||
		filters.from != null ||
		filters.to != null;

	const actions: StatsChartActions = {
		selectedBooks: filters.books,
		selectedReaders: filters.readers,
		onToggleBook: (bookSlug) =>
			void setFilters({ books: toggle(filters.books, bookSlug) }),
		onToggleReader: (username) =>
			void setFilters({ readers: toggle(filters.readers, username) }),
		onPickRange: (range) => void setFilters(range),
	};

	const stats = query.data;
	const scopeText = [
		filters.books.length > 0
			? `${filters.books.length} ${filters.books.length === 1 ? "book" : "books"}`
			: null,
		filters.readers.length > 0
			? `${filters.readers.length} ${filters.readers.length === 1 ? "reader" : "readers"}`
			: null,
		describeRange({ from: filters.from, to: filters.to }),
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<InsightsFilterRow>
					<InsightsMultiPicker
						label="Books"
						searchPlaceholder="Search their books…"
						options={(bookOptions.data?.items ?? []).map((book) => ({
							value: book.slug,
							label: book.title,
							hint: book.publishedIn > 0 ? book.publishedIn : undefined,
							lead: <InsightsBookCover book={book} className="w-5" />,
						}))}
						selected={filters.books}
						onChange={(books) => void setFilters({ books })}
						onSearch={setBookQuery}
						isLoading={bookOptions.isFetching}
					/>
					<InsightsMultiPicker
						label="Readers"
						searchPlaceholder="Search readers…"
						options={(readerOptions.data?.items ?? []).map((member) => ({
							value: member.username,
							label: member.name,
							hint: member.count,
							lead: <UserAvatar user={member} className="size-5" />,
						}))}
						selected={filters.readers}
						onChange={(readers) => void setFilters({ readers })}
						onSearch={setReaderQuery}
						isLoading={readerOptions.isFetching}
					/>
					<InsightsRangePicker
						label="Read between"
						value={{ from: filters.from, to: filters.to }}
						onChange={(range) => void setFilters(range)}
					/>
					<InsightsClearButton
						active={narrowed}
						onClear={() =>
							void setFilters({
								books: null,
								readers: null,
								from: null,
								to: null,
							})
						}
					/>
				</InsightsFilterRow>
				<p className="min-h-4 text-muted-foreground text-xs" aria-live="polite">
					{narrowed
						? `Showing ${scopeText}.`
						: `Showing everything the club has read by ${authorName}.`}
					{stats?.scope.hasRange && stats.scope.undatedReads > 0
						? ` ${stats.scope.undatedReads} ${stats.scope.undatedReads === 1 ? "read" : "reads"} without a date ${stats.scope.undatedReads === 1 ? "is" : "are"} left out.`
						: ""}
					{stats?.scope.hasComparison
						? " Changes compare with the period just before."
						: filters.from && filters.to
							? ""
							: filters.from || filters.to
								? " Pick both dates to compare with the period before."
								: ""}
				</p>
			</div>

			{query.isPending ? (
				<StatsSkeleton />
			) : query.isError || !stats ? (
				<div className="flex flex-col items-start gap-2 border border-border border-dashed p-6">
					<p className="text-sm">Could not load the stats.</p>
					<button
						type="button"
						className="text-sm underline underline-offset-4"
						onClick={() => void query.refetch()}
					>
						Try again
					</button>
				</div>
			) : stats.scope.bookCount === 0 ? (
				<div className="border border-border border-dashed p-6 text-sm">
					No book of {authorName} matches these filters.
				</div>
			) : (
				<div
					className={cn(
						"flex flex-col gap-6 transition-opacity",
						query.isFetching && "opacity-60",
					)}
					aria-busy={query.isFetching}
				>
					<AuthorStatsCards stats={stats} />

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<ActivityChart stats={stats} actions={actions} />
						<YearsChart stats={stats} actions={actions} />
						<GrowthChart stats={stats} />
						<BooksChart stats={stats} actions={actions} />
						<RatingDistributionChart stats={stats} />
						<RatingOverTimeChart stats={stats} actions={actions} />
						<FunnelDonut stats={stats} />
						<ReadingTimeChart stats={stats} />
						<SeasonChart stats={stats} />
						<LeaderboardList stats={stats} actions={actions} />
						<TimelineChart stats={stats} actions={actions} />
						<DecadesChart stats={stats} />
						<PagesChart stats={stats} />
						<SubjectsChart stats={stats} />
						<CountriesChart stats={stats} />
					</div>
				</div>
			)}
		</div>
	);
}
