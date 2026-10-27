"use client";

import type { GetUserStatsOutput } from "@bbrc/api/modules/user/user-stats.schema";
import { authorNameToSlug, getBookCountryName } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Label } from "@bbrc/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";
import { CountryLabel } from "@/components/blocks/country-dropdown";
import { UserStatsPeriodControls } from "@/components/blocks/user-stats-period-controls";
import { UserStatsWorldMap } from "@/components/blocks/user-stats-world-map";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { isUserStatsQueryReady } from "@/lib/user-stats-period-ui";
import {
	userStatsQueryInput,
	useUserStatsSearchParams,
} from "@/lib/user-stats-search-params";
import { orpc } from "@/utils/orpc";

type UserStatsPageProps = {
	username: string;
	displayName: string;
};

const cumulativeChartConfig = {
	books: { label: "Books", color: "var(--chart-1)" },
	pages: { label: "Pages", color: "var(--chart-2)" },
	authors: { label: "Authors", color: "var(--chart-3)" },
};

const barChartConfig = {
	count: { label: "Reads", color: "var(--chart-1)" },
};

function formatPace(value: number): string {
	if (value >= 10) return value.toFixed(1);
	if (value >= 1) return value.toFixed(2);
	return value.toFixed(3);
}

function StatCard({ label, value }: { label: string; value: number | string }) {
	return (
		<Card size="sm" className="border-border bg-muted/5">
			<CardHeader className="pb-2">
				<CardDescription>{label}</CardDescription>
				<CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
			</CardHeader>
		</Card>
	);
}

export function UserStatsPage({ username, displayName }: UserStatsPageProps) {
	const [params, setParams] = useUserStatsSearchParams();
	const [allReadsOpen, setAllReadsOpen] = useState(false);
	const [publicationMode, setPublicationMode] = useState<
		"year" | "decade" | "century"
	>("decade");
	const [cumulativeMetric, setCumulativeMetric] = useState<
		"books" | "pages" | "authors"
	>("books");

	const queryReady = isUserStatsQueryReady(params);
	const queryInput = useMemo(
		() => userStatsQueryInput(username, params),
		[username, params],
	);

	const { data, isPending, isError } = useQuery({
		...orpc.user.getUserStats.queryOptions({ input: queryInput }),
		enabled: queryReady,
	});

	const publicationPoints = useMemo(() => {
		if (!data) return [];
		if (publicationMode === "decade") return data.publicationByDecade;
		if (publicationMode === "century") return data.publicationByCentury;
		return data.publicationByYear;
	}, [data, publicationMode]);

	if (!queryReady || isPending) {
		return <Skeleton className="h-160 w-full" />;
	}

	if (isError || !data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load reading stats.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-col gap-4 border border-border bg-muted/10 p-4 sm:p-6">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-muted-foreground text-sm">
							<Link
								href={`/users/${username}` as Route}
								className="hover:text-foreground"
							>
								{displayName}
							</Link>
						</p>
						<h1 className="font-medium text-2xl tracking-tight sm:text-3xl">
							{data.title}
						</h1>
					</div>
					<UserStatsPeriodControls
						params={params}
						setParams={setParams}
						firstDatedReadYear={data.firstDatedReadYear}
					/>
				</div>
				{(data.catalogCoveragePercent != null || data.readerRank != null) && (
					<p className="max-w-[65ch] text-muted-foreground text-sm leading-relaxed">
						{data.catalogBooksTotal > 0 ? (
							<span>
								{data.catalogBooksRead} of {data.catalogBooksTotal} catalog
								books read
								{data.periodType === "none"
									? " in their library"
									: " in this period"}
								{data.catalogCoveragePercent != null
									? ` (${data.catalogCoveragePercent}%)`
									: ""}
								.{" "}
							</span>
						) : null}
						{data.readerRank != null && data.readerPoolSize != null ? (
							<span>
								Rank #{data.readerRank} of {data.readerPoolSize} members with
								dated reads in this period
								{data.readerPercentile != null && data.readerPercentile <= 50
									? ` (top ${data.readerPercentile}%)`
									: ""}
								.
							</span>
						) : null}
					</p>
				)}
			</header>

			<section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard label="Books read" value={data.cards.booksRead} />
				<StatCard label="Pages read" value={data.cards.pagesRead} />
				<StatCard
					label="Authors (distinct)"
					value={data.cards.distinctAuthors}
				/>
				<StatCard
					label="Countries (distinct)"
					value={data.cards.distinctCountries}
				/>
				<StatCard label="Feedbacks" value={data.cards.feedbacks} />
				<StatCard label="Posts" value={data.cards.posts} />
				<StatCard label="Shelves" value={data.cards.shelves} />
				<StatCard
					label="Sitting participations"
					value={data.cards.participations}
				/>
				<StatCard
					label="Catalog additions"
					value={data.cards.catalogAdditions}
				/>
				<StatCard label="Catalog requests" value={data.cards.catalogRequests} />
				<StatCard label="Comments" value={data.cards.comments} />
				<StatCard
					label="Sittings completed"
					value={data.cards.sittingsCompleted}
				/>
			</section>

			<ReadCoverGrid data={data} onViewAll={() => setAllReadsOpen(true)} />

			{data.periodType !== "none" ? (
				<Card size="sm">
					<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
						<div>
							<CardTitle>Reading progress over time</CardTitle>
							<CardDescription>
								Cumulative total by month in this period
							</CardDescription>
						</div>
						<Select
							value={cumulativeMetric}
							onValueChange={(value) =>
								setCumulativeMetric(value as typeof cumulativeMetric)
							}
						>
							<SelectTrigger className="h-8 w-[140px]">
								<span>{cumulativeChartConfig[cumulativeMetric].label}</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="books">Books</SelectItem>
								<SelectItem value="pages">Pages</SelectItem>
								<SelectItem value="authors">Authors</SelectItem>
							</SelectContent>
						</Select>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={cumulativeChartConfig}
							className="h-72 w-full"
						>
							<LineChart
								data={data.cumulativeSeries}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									width={48}
									tickMargin={4}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Line
									type="monotone"
									dataKey={cumulativeMetric}
									stroke={`var(--color-${cumulativeMetric})`}
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					</CardContent>
				</Card>
			) : null}

			{data.readingPace ? (
				<Card size="sm">
					<CardHeader>
						<CardTitle>Reading pace</CardTitle>
						<CardDescription>
							Based on dated reads in the selected period
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6 sm:grid-cols-2">
						<PaceBlock
							title="Books"
							pace={data.readingPace}
							mode="books"
							periodType={data.periodType}
						/>
						<PaceBlock
							title="Pages"
							pace={data.readingPace}
							mode="pages"
							periodType={data.periodType}
						/>
					</CardContent>
				</Card>
			) : null}

			{data.readsTimeline.mode !== "hidden" ? (
				<Card size="sm">
					<CardHeader>
						<CardTitle>
							Reads by {data.readsTimeline.mode === "year" ? "year" : "month"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={barChartConfig} className="h-56 w-full">
							<BarChart
								data={data.readsTimeline.points}
								margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="label" tickLine={false} axisLine={false} />
								<YAxis
									allowDecimals={false}
									tickLine={false}
									axisLine={false}
									width={32}
									tickMargin={4}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="count" fill="var(--color-count)" />
							</BarChart>
						</ChartContainer>
					</CardContent>
				</Card>
			) : null}

			<div className="grid gap-4 lg:grid-cols-2">
				<HistogramCard
					title="Subject breakdown"
					description="Grouped from Open Library subject tags (similar labels merged)"
				>
					<ul className="flex flex-col gap-2">
						{data.subjectBreakdown.length === 0 ? (
							<li className="text-muted-foreground text-sm">
								No subjects yet.
							</li>
						) : (
							data.subjectBreakdown.map((row) => (
								<li
									key={row.subject}
									className="flex items-baseline justify-between gap-3 border-border border-b py-2 text-sm last:border-0"
								>
									<span className="min-w-0 truncate">{row.subject}</span>
									<span className="shrink-0 text-muted-foreground tabular-nums">
										{row.count} ({row.percentage}%)
									</span>
								</li>
							))
						)}
					</ul>
				</HistogramCard>

				<HistogramCard
					title="Books by club rating"
					description={
						data.ratingHistogram.topBucket
							? `Most reads: ${data.ratingHistogram.topBucket} stars${
									data.ratingHistogram.averageClubRating != null
										? ` · avg ${data.ratingHistogram.averageClubRating.toFixed(2)}`
										: ""
								}`
							: "Club average rating distribution"
					}
				>
					<BarHistogram points={data.ratingHistogram.points} />
				</HistogramCard>

				<HistogramCard
					title="Books by page count"
					description={
						data.pagesHistogram.topBucket
							? `Most reads: ${data.pagesHistogram.topBucket} pages`
							: "Page length distribution"
					}
				>
					<BarHistogram points={data.pagesHistogram.points} />
				</HistogramCard>

				<HistogramCard
					title="Books by publication period"
					description="Switch granularity for publish dates of reads"
					action={
						<Select
							value={publicationMode}
							onValueChange={(value) =>
								setPublicationMode(value as typeof publicationMode)
							}
						>
							<SelectTrigger className="h-8 w-[120px]">
								<span>
									{publicationMode === "year"
										? "Year"
										: publicationMode === "decade"
											? "Decade"
											: "Century"}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="year">Year</SelectItem>
								<SelectItem value="decade">Decade</SelectItem>
								<SelectItem value="century">Century</SelectItem>
							</SelectContent>
						</Select>
					}
				>
					<BarHistogram points={publicationPoints} />
				</HistogramCard>
			</div>

			<TopAuthorsCountries
				title="Authors"
				rowsByCount={data.topAuthors}
				rowsByRating={data.topAuthorsByRating}
				mode="authors"
			/>
			<TopAuthorsCountries
				title="Countries"
				rowsByCount={data.topCountries}
				rowsByRating={data.topCountriesByRating}
				mode="countries"
			/>

			<RatingCompareSection
				title="Rated higher than club"
				rows={data.ratedHigherThanClub}
				empty="No books rated above club average in this period."
			/>
			<RatingCompareSection
				title="Rated lower than club"
				rows={data.ratedLowerThanClub}
				empty="No books rated below club average in this period."
			/>

			{data.topReviews.length > 0 ? (
				<Card size="sm">
					<CardHeader>
						<CardTitle>Most engaged reviews</CardTitle>
						<CardDescription>
							Likes and comments on your feedback
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="flex flex-col gap-3">
							{data.topReviews.map((review) => (
								<li
									key={review.feedbackSlug}
									className="flex flex-wrap items-center justify-between gap-2 border-border border-b pb-3 text-sm last:border-0"
								>
									<Link
										href={
											`/books/${review.book.slug}/feedbacks/${review.feedbackSlug}` as Route
										}
										className="font-medium hover:underline"
									>
										{review.book.title}
									</Link>
									<span className="text-muted-foreground tabular-nums">
										{review.likeCount} likes · {review.commentCount} comments
									</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			<PopularReads title="Most popular reads" rows={data.mostPopularReads} />
			<PopularReads title="Least popular reads" rows={data.leastPopularReads} />

			<Card size="sm">
				<CardHeader>
					<CardTitle>Where your books were published</CardTitle>
					<CardDescription>Literary origin countries of reads</CardDescription>
				</CardHeader>
				<CardContent>
					<UserStatsWorldMap countryBookCounts={data.countryMapCounts} />
				</CardContent>
			</Card>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Top series</CardTitle>
					<CardDescription>Most books read from a series</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-3">
						{data.topSeries.length === 0 ? (
							<li className="text-muted-foreground text-sm">
								No series reads in this period.
							</li>
						) : (
							data.topSeries.map((series) => (
								<li
									key={series.seriesSlug}
									className="border-border border-b pb-3 last:border-0"
								>
									<Link
										href={`/series/${series.seriesSlug}` as Route}
										className="font-medium hover:underline"
									>
										{series.seriesTitle}
									</Link>
									<p className="text-muted-foreground text-sm">
										{series.bookCount} book{series.bookCount === 1 ? "" : "s"}
									</p>
								</li>
							))
						)}
					</ul>
				</CardContent>
			</Card>

			<AllReadsDialog
				open={allReadsOpen}
				onOpenChange={setAllReadsOpen}
				username={username}
				books={data.readGrid.allBooks}
				total={data.readGrid.totalInPeriod}
			/>
		</div>
	);
}

function ReadCoverGrid({
	data,
	onViewAll,
}: {
	data: GetUserStatsOutput;
	onViewAll: () => void;
}) {
	const cells = data.readGrid.books;
	const showMore = data.readGrid.hasMore;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-medium text-lg tracking-tight">Books read</h2>
			<div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12">
				{cells.map((book) => (
					<CoverCell key={book.id} book={book} />
				))}
				{showMore ? (
					<button
						type="button"
						onClick={onViewAll}
						className="flex aspect-[2/3] items-center justify-center border border-border bg-muted/30 text-2xl text-muted-foreground transition-colors hover:bg-muted/50"
						aria-label="View all reads"
					>
						+
					</button>
				) : null}
			</div>
		</section>
	);
}

function CoverCell({
	book,
}: {
	book: GetUserStatsOutput["readGrid"]["books"][number];
}) {
	const src = bookCoverUrl(book.coverId, "S");
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						href={`/books/${book.slug}` as Route}
						className="relative block aspect-[2/3] overflow-hidden border border-border bg-muted/20"
					>
						{src ? (
							<Image
								src={src}
								alt=""
								fill
								className="object-cover"
								sizes="80px"
							/>
						) : (
							<span className="flex size-full items-center justify-center p-1 text-3xs text-muted-foreground">
								No cover
							</span>
						)}
					</Link>
				}
			/>
			<TooltipContent side="top" className="max-w-xs">
				<p className="font-medium">{book.title}</p>
				<p className="text-muted-foreground text-xs">
					{formatBookAuthors(book.authors)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}

function PaceBlock({
	title,
	pace,
	mode,
	periodType,
}: {
	title: string;
	pace: NonNullable<GetUserStatsOutput["readingPace"]>;
	mode: "books" | "pages";
	periodType: GetUserStatsOutput["periodType"];
}) {
	const perYear = mode === "books" ? pace.booksPerYear : pace.pagesPerYear;
	const perMonth = mode === "books" ? pace.booksPerMonth : pace.pagesPerMonth;
	const perWeek = mode === "books" ? pace.booksPerWeek : pace.pagesPerWeek;
	const perDay = mode === "books" ? pace.booksPerDay : pace.pagesPerDay;
	const yearLabel =
		periodType === "year"
			? mode === "books"
				? "Books in year"
				: "Pages in year"
			: mode === "books"
				? "Per year"
				: "Per year";

	return (
		<div className="flex flex-col gap-2 text-sm">
			<p className="font-medium">{title}</p>
			<dl className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
				{periodType !== "month" ? (
					<div className="flex justify-between gap-2">
						<dt className="text-muted-foreground">{yearLabel}</dt>
						<dd>{formatPace(perYear)}</dd>
					</div>
				) : null}
				<div className="flex justify-between gap-2">
					<dt className="text-muted-foreground">
						{periodType === "month" ? "In month" : "Per month"}
					</dt>
					<dd>{formatPace(perMonth)}</dd>
				</div>
				<div className="flex justify-between gap-2">
					<dt className="text-muted-foreground">Per week</dt>
					<dd>{formatPace(perWeek)}</dd>
				</div>
				<div className="flex justify-between gap-2">
					<dt className="text-muted-foreground">Per day</dt>
					<dd>{formatPace(perDay)}</dd>
				</div>
			</dl>
		</div>
	);
}

function HistogramCard({
	title,
	description,
	children,
	action,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<Card size="sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
				<div>
					<CardTitle>{title}</CardTitle>
					{description ? (
						<CardDescription>{description}</CardDescription>
					) : null}
				</div>
				{action}
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function BarHistogram({
	points,
}: {
	points: { label: string; count: number }[];
}) {
	if (points.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">No data for this period.</p>
		);
	}
	return (
		<ChartContainer config={barChartConfig} className="h-52 w-full">
			<BarChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-35}
					textAnchor="end"
					height={56}
				/>
				<YAxis
					allowDecimals={false}
					tickLine={false}
					axisLine={false}
					width={32}
					tickMargin={4}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<Bar dataKey="count" fill="var(--color-count)" />
			</BarChart>
		</ChartContainer>
	);
}

function TopAuthorsCountries({
	title,
	rowsByCount,
	rowsByRating,
	mode,
}: {
	title: string;
	rowsByCount: GetUserStatsOutput["topAuthors"];
	rowsByRating: GetUserStatsOutput["topAuthorsByRating"];
	mode: "authors" | "countries";
}) {
	const [showMostRated, setShowMostRated] = useState(false);
	const rows = showMostRated ? rowsByRating : rowsByCount;
	const toggleId =
		mode === "authors"
			? "user-stats-authors-rated"
			: "user-stats-countries-rated";

	return (
		<Card size="sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
				<CardTitle>{title}</CardTitle>
				<div className="flex items-center gap-2">
					<Checkbox
						id={toggleId}
						checked={showMostRated}
						onCheckedChange={(checked) => setShowMostRated(checked === true)}
					/>
					<Label
						htmlFor={toggleId}
						className="cursor-pointer font-normal text-sm"
					>
						Show most rated
					</Label>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{rows.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{showMostRated
							? "Rate books in this period to see top averages."
							: "No data yet."}
					</p>
				) : (
					rows.map((row) => (
						<div
							key={row.key}
							className="border-border border-b pb-4 last:border-0"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								{mode === "countries" ? (
									<CountryLabel
										alpha2={row.key}
										name={getBookCountryName(row.key) ?? row.label}
										className="font-medium"
									/>
								) : (
									<Link
										href={
											`/authors/${row.slug ?? authorNameToSlug(row.label)}` as Route
										}
										className="font-medium underline-offset-4 hover:underline"
									>
										{row.label}
									</Link>
								)}
								<p className="text-muted-foreground text-sm tabular-nums">
									{row.bookCount} books
									{row.userAverageRating != null
										? ` · your avg ${row.userAverageRating.toFixed(1)}`
										: ""}
								</p>
							</div>
							{row.topRatedBook ? (
								<p className="mt-1 text-muted-foreground text-xs">
									Top rated:{" "}
									<Link
										href={`/books/${row.topRatedBook.slug}` as Route}
										className="text-foreground hover:underline"
									>
										{row.topRatedBook.title}
									</Link>
								</p>
							) : null}
						</div>
					))
				)}
			</CardContent>
		</Card>
	);
}

function RatingCompareSection({
	title,
	rows,
	empty,
}: {
	title: string;
	rows: GetUserStatsOutput["ratedHigherThanClub"];
	empty: string;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{rows.length === 0 ? (
					<p className="text-muted-foreground text-sm">{empty}</p>
				) : (
					<ul className="flex flex-col gap-2">
						{rows.map((book) => (
							<li
								key={book.id}
								className="flex flex-wrap justify-between gap-2 text-sm"
							>
								<Link
									href={`/books/${book.slug}` as Route}
									className="font-medium hover:underline"
								>
									{book.title}
								</Link>
								<span className="text-muted-foreground tabular-nums">
									You {book.userRating.toFixed(1)} · Club{" "}
									{book.clubRating?.toFixed(1) ?? "—"} (
									{book.delta > 0 ? "+" : ""}
									{book.delta.toFixed(1)})
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function PopularReads({
	title,
	rows,
}: {
	title: string;
	rows: GetUserStatsOutput["mostPopularReads"];
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					Your reads in this period; club totals are all-time
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="flex flex-col gap-2">
					{rows.length === 0 ? (
						<li className="text-muted-foreground text-sm">No reads yet.</li>
					) : (
						rows.map((book) => (
							<li
								key={book.id}
								className="flex flex-wrap justify-between gap-2 border-border border-b py-2 text-sm last:border-0"
							>
								<Link
									href={`/books/${book.slug}` as Route}
									className="font-medium hover:underline"
								>
									{book.title}
								</Link>
								<span className="text-muted-foreground tabular-nums">
									{book.clubReadCount} club reads
								</span>
							</li>
						))
					)}
				</ul>
			</CardContent>
		</Card>
	);
}

function AllReadsDialog({
	open,
	onOpenChange,
	username,
	books,
	total,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	username: string;
	books: GetUserStatsOutput["readGrid"]["books"];
	total: number;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>All reads ({total})</DialogTitle>
				</DialogHeader>
				<ul className="flex flex-col gap-2">
					{books.map((book) => (
						<li key={book.id}>
							<Link
								href={`/books/${book.slug}` as Route}
								className="text-sm hover:underline"
							>
								{book.title}
							</Link>
							<p className="text-muted-foreground text-xs">
								{formatBookAuthors(book.authors)}
							</p>
						</li>
					))}
				</ul>
				<Button render={<Link href={`/users/${username}/reads` as Route} />}>
					Open reads on profile
				</Button>
			</DialogContent>
		</Dialog>
	);
}
