import type { AuthorStatsOutput } from "@bbrc/api/modules/author/author.schema";
import type { Route } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/blocks/user-avatar";
import {
	AuthorPageCover,
	AuthorPageEmpty,
	AuthorPageSection,
} from "./author-page-bits";

type Bar = { label: string; value: number };

/** Plain columns, so the chart takes the theme colours and needs no chart library. */
function Columns({
	bars,
	caption,
	valueLabel,
}: {
	bars: Bar[];
	caption: string;
	valueLabel: (bar: Bar) => string;
}) {
	const max = Math.max(1, ...bars.map((bar) => bar.value));

	return (
		<figure className="flex flex-col gap-1">
			<div
				className="flex h-32 items-end gap-1 border-border border-b"
				role="img"
				aria-label={caption}
			>
				{bars.map((bar) => (
					<div
						key={bar.label}
						className="flex h-full min-w-0 flex-1 flex-col justify-end"
						title={valueLabel(bar)}
					>
						<div
							className="w-full bg-primary"
							style={{
								height: `${bar.value === 0 ? 0 : Math.max(3, (bar.value / max) * 100)}%`,
							}}
						/>
					</div>
				))}
			</div>
			<div className="flex gap-1 text-2xs text-muted-foreground tabular-nums">
				{bars.map((bar) => (
					<span key={bar.label} className="min-w-0 flex-1 truncate text-center">
						{bar.label}
					</span>
				))}
			</div>
			<ul className="sr-only">
				{bars.map((bar) => (
					<li key={bar.label}>{valueLabel(bar)}</li>
				))}
			</ul>
		</figure>
	);
}

function BookHighlight({
	title,
	book,
	detail,
}: {
	title: string;
	book: NonNullable<AuthorStatsOutput["mostReadBook"]>["book"];
	detail: string;
}) {
	return (
		<Link
			href={`/books/${book.slug}` as Route}
			className="flex gap-3 border border-border p-3 transition-colors hover:bg-muted/40"
		>
			<div className="w-12 shrink-0">
				<AuthorPageCover
					coverId={book.coverId}
					title={book.title}
					sizes="48px"
				/>
			</div>
			<div className="flex min-w-0 flex-col gap-0.5">
				<p className="text-muted-foreground text-xs">{title}</p>
				<p className="line-clamp-2 font-medium text-sm">{book.title}</p>
				<p className="text-muted-foreground text-xs tabular-nums">{detail}</p>
			</div>
		</Link>
	);
}

function days(value: number): string {
	const rounded = Math.round(value);
	return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}

export function AuthorPageStats({ stats }: { stats: AuthorStatsOutput }) {
	const hasAnything =
		stats.ratings.count > 0 ||
		stats.leaderboard.length > 0 ||
		stats.readingTime.finishedCount > 0 ||
		stats.mostReadBook != null;

	if (!hasAnything) {
		return (
			<AuthorPageEmpty>
				No club numbers yet. They appear once members read and review books by
				this author.
			</AuthorPageEmpty>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="grid gap-3 md:grid-cols-3">
				{stats.mostReadBook ? (
					<BookHighlight
						title="Most read"
						book={stats.mostReadBook.book}
						detail={`${stats.mostReadBook.readCount} ${stats.mostReadBook.readCount === 1 ? "read" : "reads"}`}
					/>
				) : null}
				{stats.mostReviewedBook ? (
					<BookHighlight
						title="Most reviewed"
						book={stats.mostReviewedBook.book}
						detail={`${stats.mostReviewedBook.reviewCount} ${stats.mostReviewedBook.reviewCount === 1 ? "review" : "reviews"}`}
					/>
				) : null}
				{stats.highestRatedBook ? (
					<BookHighlight
						title="Highest rated"
						book={stats.highestRatedBook.book}
						detail={`${stats.highestRatedBook.rating.toFixed(1)} / 5 from ${stats.highestRatedBook.reviewCount} ${stats.highestRatedBook.reviewCount === 1 ? "review" : "reviews"}`}
					/>
				) : null}
			</div>

			{stats.ratings.count > 0 ? (
				<AuthorPageSection
					title="Ratings"
					description={
						stats.ratings.average != null
							? `${stats.ratings.average.toFixed(2)} out of 5 across ${stats.ratings.count} ${stats.ratings.count === 1 ? "review" : "reviews"}`
							: undefined
					}
				>
					<Columns
						bars={stats.ratings.distribution.map((bucket) => ({
							label: String(bucket.rating),
							value: bucket.count,
						}))}
						caption="How members rated this author's books, in half-star steps"
						valueLabel={(bar) => `${bar.label} stars: ${bar.value}`}
					/>
				</AuthorPageSection>
			) : null}

			{stats.readingTime.finishedCount > 0 ? (
				<AuthorPageSection
					title="Reading time"
					description={`From ${stats.readingTime.finishedCount} finished ${stats.readingTime.finishedCount === 1 ? "session" : "sessions"}`}
				>
					<div className="flex flex-col gap-3">
						<p className="text-sm tabular-nums">
							{stats.readingTime.averageDays != null
								? `Members take ${days(stats.readingTime.averageDays)} on average`
								: null}
							{stats.readingTime.medianDays != null
								? `, ${days(stats.readingTime.medianDays)} in the middle`
								: null}
							.
						</p>
						{stats.readingTime.perBook.length > 0 ? (
							<ul className="flex flex-col border-border border-t">
								{stats.readingTime.perBook.map((row) => (
									<li
										key={row.book.slug}
										className="flex items-center justify-between gap-3 border-border border-b py-1.5 text-sm"
									>
										<Link
											href={`/books/${row.book.slug}` as Route}
											className="truncate hover:underline"
										>
											{row.book.title}
										</Link>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{days(row.averageDays)} · {row.readers}{" "}
											{row.readers === 1 ? "reader" : "readers"}
										</span>
									</li>
								))}
							</ul>
						) : null}
					</div>
				</AuthorPageSection>
			) : null}

			{stats.leaderboard.length > 0 ? (
				<AuthorPageSection
					title="Biggest readers"
					description="Members who have read the most of this author's books"
				>
					<ol className="grid gap-2 sm:grid-cols-2">
						{stats.leaderboard.map((row, index) => (
							<li key={row.member.username}>
								<Link
									href={`/users/${row.member.username}` as Route}
									className="flex items-center gap-3 border border-border p-2 transition-colors hover:bg-muted/40"
								>
									<span className="w-5 text-center text-muted-foreground text-xs tabular-nums">
										{index + 1}
									</span>
									<UserAvatar user={row.member} className="size-8" />
									<span className="min-w-0 flex-1 truncate text-sm">
										{row.member.name}
									</span>
									<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
										{row.readCount} of {row.totalBooks}
									</span>
								</Link>
							</li>
						))}
					</ol>
				</AuthorPageSection>
			) : null}

			{stats.booksPerDecade.length > 0 ? (
				<AuthorPageSection title="Books by decade published">
					<Columns
						bars={stats.booksPerDecade.map((entry) => ({
							label: `${entry.decade}s`,
							value: entry.count,
						}))}
						caption="Number of the author's books published in each decade"
						valueLabel={(bar) => `${bar.label}: ${bar.value}`}
					/>
				</AuthorPageSection>
			) : null}

			{stats.readsPerYear.length > 0 ? (
				<AuthorPageSection title="Reads by year finished">
					<Columns
						bars={stats.readsPerYear.map((entry) => ({
							label: String(entry.year),
							value: entry.count,
						}))}
						caption="Number of reads of this author's books, by the year they were finished"
						valueLabel={(bar) => `${bar.label}: ${bar.value}`}
					/>
				</AuthorPageSection>
			) : null}
		</div>
	);
}
