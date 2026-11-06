"use client";

import type { MemberStatsTasteOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import { getBookCountryName } from "@bbrc/shared";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import type { Route } from "next";
import Link from "next/link";
import { CountryLabel } from "@/components/blocks/country-dropdown";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import {
	authorViews,
	subjectViews,
	useAuthorView,
	useSubjectView,
} from "@/lib/stats/stats-params";
import { useReadsHref } from "@/lib/stats/use-reads-href";
import { CoverLink } from "../cover-link";
import { HistogramChart } from "../stats-charts";
import { RankedBars, StatsEmpty, StatsSection } from "../stats-kit";
import { StatsWorldMap } from "../stats-world-map";

type AuthorRow = MemberStatsTasteOutput["authors"]["byCount"][number];

const stars = (value: number) => `${value.toFixed(1)}★`;
const books = (count: number) => `${count} ${count === 1 ? "book" : "books"}`;

function AuthorLine({
	row,
	byRating,
	readsHref,
}: {
	row: AuthorRow;
	byRating: boolean;
	readsHref: string | null;
}) {
	const name = (
		<span className="truncate font-medium text-sm">{row.label}</span>
	);
	return (
		<li className="flex items-center gap-3 border border-border bg-background p-2.5">
			<Avatar className="size-11 shrink-0">
				{row.photoUrl ? <AvatarImage src={row.photoUrl} alt="" /> : null}
				<AvatarFallback>{row.label.charAt(0)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				{row.slug ? (
					<Link
						href={`/authors/${row.slug}` as Route}
						className="min-w-0 underline-offset-4 hover:underline"
					>
						{name}
					</Link>
				) : (
					name
				)}
				<span className="text-muted-foreground text-xs tabular-nums">
					{readsHref ? (
						<Link
							href={readsHref as Route}
							className="underline-offset-4 hover:text-foreground hover:underline"
							title="Open these reads"
						>
							{books(row.count)}
						</Link>
					) : (
						books(row.count)
					)}
					{row.average != null ? ` · avg ${stars(row.average)}` : ""}
				</span>
			</div>
			<ul className="hidden w-32 shrink-0 grid-cols-4 gap-1 sm:grid">
				{row.books.slice(0, 4).map((book) => (
					<li key={book.id}>
						<CoverLink
							book={book}
							detail={
								byRating && row.topBook?.id === book.id
									? "Their top rated"
									: null
							}
						/>
					</li>
				))}
			</ul>
		</li>
	);
}

function CoverGrid({
	items,
}: {
	items: {
		book: {
			id: string;
			slug: string;
			title: string;
			authors: string[];
			coverId: number | null;
		};
		caption: string;
		detail?: string;
	}[];
}) {
	if (items.length === 0) return <StatsEmpty>Nothing here yet.</StatsEmpty>;
	return (
		<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
			{items.map((item) => (
				<li key={item.book.id}>
					<CoverLink
						book={item.book}
						caption={item.caption}
						detail={item.detail}
					/>
				</li>
			))}
		</ul>
	);
}

export function TasteTab({
	data,
	username,
}: {
	data: MemberStatsTasteOutput;
	username: string;
}) {
	const readsHref = useReadsHref(username);
	const [subjectView, setSubjectView] = useSubjectView();
	const [authorView, setAuthorView] = useAuthorView();

	const subjectsRated = subjectView === "rated" && data.subjects.topRated;
	const authorsRated = authorView === "rated" && data.authors.byRating;
	const authors = authorsRated ? data.authors.byRating : data.authors.byCount;
	const hasRatings = data.authors.byRating != null;

	return (
		<div className="flex flex-col gap-4">
			{data.access.reads ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<StatsSection
						id="subjects"
						title="Subjects"
						description={
							subjectsRated
								? "Subjects with the highest average rating (at least two rated books)."
								: "The subjects of the books, by how many books carry them."
						}
						actions={
							data.subjects.topRated ? (
								<SegmentedControl
									label="Subjects"
									value={subjectView}
									options={subjectViews.map((id) => ({
										id,
										label: id === "read" ? "Most read" : "Highest rated",
									}))}
									onChange={(next) => void setSubjectView(next)}
								/>
							) : null
						}
					>
						{subjectsRated && data.subjects.topRated ? (
							data.subjects.topRated.length === 0 ? (
								<StatsEmpty>Not enough rated books yet.</StatsEmpty>
							) : (
								<RankedBars
									rows={data.subjects.topRated.map((row) => ({
										label: row.subject,
										value: row.average,
										hint: books(row.count),
									}))}
									format={stars}
									hrefFor={(subject) => readsHref({ kind: "subject", subject })}
								/>
							)
						) : data.subjects.top.length === 0 ? (
							<StatsEmpty>No subjects for these books.</StatsEmpty>
						) : (
							<RankedBars
								rows={data.subjects.top.map((row) => ({
									label: row.subject,
									value: row.count,
									hint: `${row.percent}% of subject tags`,
								}))}
								hrefFor={(subject) => readsHref({ kind: "subject", subject })}
							/>
						)}
					</StatsSection>

					<StatsSection
						id="authors"
						title="Authors"
						description={
							authorsRated
								? "Authors with the highest average rating (at least two books)."
								: "The authors read the most."
						}
						actions={
							hasRatings ? (
								<SegmentedControl
									label="Authors"
									value={authorView}
									options={authorViews.map((id) => ({
										id,
										label: id === "read" ? "Most read" : "Highest rated",
									}))}
									onChange={(next) => void setAuthorView(next)}
								/>
							) : null
						}
					>
						{authors && authors.length > 0 ? (
							<ul className="flex flex-col gap-2">
								{authors.map((row) => (
									<AuthorLine
										key={row.key}
										row={row}
										byRating={Boolean(authorsRated)}
										readsHref={
											row.slug
												? readsHref({ kind: "author", slug: row.slug })
												: null
										}
									/>
								))}
							</ul>
						) : (
							<StatsEmpty>No authors to show yet.</StatsEmpty>
						)}
					</StatsSection>
				</div>
			) : null}

			{data.access.reads ? (
				<StatsSection
					id="countries"
					title="Countries"
					description="Where the books come from."
				>
					{data.countries.rows.length === 0 ? (
						<StatsEmpty>No country data for these books.</StatsEmpty>
					) : (
						<ul className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
							{data.countries.rows.map((row) => (
								<li key={row.code} className="bg-card">
									<Link
										href={
											(readsHref({ kind: "country", code: row.code }) ??
												`/users/${username}/reads`) as Route
										}
										className="flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
									>
										<CountryLabel
											alpha2={row.code}
											name={getBookCountryName(row.code) ?? row.code}
											className="min-w-0 text-sm"
										/>
										<span className="flex shrink-0 flex-col items-end text-xs tabular-nums">
											<span className="font-semibold">{row.count}</span>
											{row.average != null ? (
												<span className="text-muted-foreground">
													{stars(row.average)}
												</span>
											) : null}
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</StatsSection>
			) : null}

			{data.access.reads ? (
				<StatsSection
					id="map"
					title="Map"
					description="Each country shaded by how many of the books come from it."
				>
					<StatsWorldMap
						counts={data.countries.map}
						hrefFor={(code) => readsHref({ kind: "country", code })}
					/>
				</StatsSection>
			) : null}

			{data.access.reads ? (
				<StatsSection
					id="series"
					title="Series"
					description="The series read the most, and how far through each."
				>
					{data.series.length === 0 ? (
						<StatsEmpty>No books from a series in this period.</StatsEmpty>
					) : (
						<ul className="grid gap-3 md:grid-cols-2">
							{data.series.map((row) => (
								<li
									key={row.slug}
									className="flex flex-col gap-2 border border-border bg-background p-3"
								>
									<div className="flex items-baseline justify-between gap-2">
										<Link
											href={`/series/${row.slug}` as Route}
											className="min-w-0 truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{row.title}
										</Link>
										<Link
											href={
												(readsHref({ kind: "series", slug: row.slug }) ??
													`/users/${username}/reads`) as Route
											}
											className="shrink-0 text-muted-foreground text-xs tabular-nums underline-offset-4 hover:text-foreground hover:underline"
											title="Open these reads"
										>
											{row.total
												? `${row.read} of ${row.total}`
												: books(row.read)}
										</Link>
									</div>
									{row.total ? (
										<span className="block h-1.5 bg-muted" aria-hidden>
											<span
												className="block h-full bg-primary"
												style={{
													width: `${Math.min(100, (row.read / row.total) * 100)}%`,
												}}
											/>
										</span>
									) : null}
									<ul className="grid grid-cols-6 gap-1.5">
										{row.books.map((book) => (
											<li key={book.id}>
												<CoverLink book={book} />
											</li>
										))}
									</ul>
								</li>
							))}
						</ul>
					)}
				</StatsSection>
			) : null}

			{data.access.reads ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<StatsSection
						id="club-rating"
						title="Books by club rating"
						description={
							data.clubRating.average != null
								? `Average club rating ${data.clubRating.average.toFixed(1)}${data.clubRating.topBucket ? `, most often ${data.clubRating.topBucket}` : ""}.`
								: "How the club rated these books."
						}
					>
						<HistogramChart
							points={data.clubRating.points}
							hrefFor={(bucket) => readsHref({ kind: "clubRating", bucket })}
						/>
					</StatsSection>
					<StatsSection
						id="popular"
						title="Most and least popular reads"
						description="By how many members in the club have read each book."
					>
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<h3 className="font-medium text-muted-foreground text-xs">
									Most popular
								</h3>
								<CoverGrid
									items={data.popular.most.map((row) => ({
										book: row,
										caption: `${row.clubReads} read`,
									}))}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<h3 className="font-medium text-muted-foreground text-xs">
									Least popular
								</h3>
								<CoverGrid
									items={data.popular.least.map((row) => ({
										book: row,
										caption: `${row.clubReads} read`,
									}))}
								/>
							</div>
						</div>
					</StatsSection>
				</div>
			) : null}

			{data.ratedVsClub ? (
				<StatsSection
					id="rated-vs-club"
					title="Rated against the club"
					description={`Each book against the average of everyone else's ratings (at least two). ${
						data.ratedVsClub.skipped > 0
							? `${data.ratedVsClub.skipped} ${data.ratedVsClub.skipped === 1 ? "book was" : "books were"} left out: too few other ratings.`
							: ""
					}`}
				>
					<div className="grid gap-5 lg:grid-cols-2">
						{(
							[
								["Rated higher than the others", data.ratedVsClub.higher],
								["Rated lower than the others", data.ratedVsClub.lower],
							] as const
						).map(([title, rows]) => (
							<div key={title} className="flex flex-col gap-2">
								<h3 className="font-medium text-muted-foreground text-xs">
									{title}
								</h3>
								{rows.length === 0 ? (
									<StatsEmpty>None.</StatsEmpty>
								) : (
									<ul className="grid grid-cols-3 gap-3 md:grid-cols-3 xl:grid-cols-6">
										{rows.map((row) => (
											<li key={row.book.id}>
												<CoverLink
													book={row.book}
													caption={`${row.mine}★ vs ${row.othersAverage.toFixed(1)}`}
													detail={`Based on ${row.othersCount} other ratings`}
												/>
											</li>
										))}
									</ul>
								)}
							</div>
						))}
					</div>
				</StatsSection>
			) : null}
		</div>
	);
}
