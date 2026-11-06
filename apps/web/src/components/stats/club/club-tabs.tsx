"use client";

import type {
	ClubStatsClubLife,
	ClubStatsCommunity,
	ClubStatsOverview,
	ClubStatsReading,
	ClubStatsTaste,
} from "@bbrc/api/modules/club-stats/club-stats.schema";
import { CUMULATIVE_METRICS, getBookCountryName } from "@bbrc/shared";
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
	paceMetrics,
	publicationModes,
	subjectViews,
	useAuthorView,
	useCumulativeMetrics,
	usePaceMetric,
	usePublicationMode,
	useSubjectView,
} from "@/lib/stats/stats-params";
import { CoverLink } from "../cover-link";
import { CumulativeArea } from "../cumulative-area";
import {
	CumulativeChart,
	GroupedBarsChart,
	HistogramChart,
	METRIC_LABELS,
	PaceChart,
} from "../stats-charts";
import {
	ChangeChip,
	RankedBars,
	StatRow,
	StatsEmpty,
	StatsSection,
} from "../stats-kit";
import { StatsWorldMap } from "../stats-world-map";

const n = (value: number) => value.toLocaleString("en-US");
const hours = (seconds: number) =>
	seconds < 3600
		? `${Math.round(seconds / 60)} min`
		: `${(seconds / 3600).toFixed(1)} h`;
const books = (count: number) => `${count} ${count === 1 ? "book" : "books"}`;

/* --------------------------------------------------------------- overview */

export function ClubOverviewTab({ data }: { data: ClubStatsOverview }) {
	return (
		<div className="flex flex-col gap-4">
			{data.readsOverTime.mode !== "hidden" ? (
				<StatsSection
					id="reads-over-time"
					title="Reads over time"
					description={
						data.readsOverTime.mode === "month"
							? "Books finished each month, by everyone."
							: "Books finished each year, by everyone."
					}
				>
					<HistogramChart points={data.readsOverTime.points} />
				</StatsSection>
			) : null}

			<StatsSection
				id="top-readers"
				title="Top readers"
				description="Who finished the most books. A private profile shows as a member without a name."
			>
				{data.topReaders.length === 0 ? (
					<StatsEmpty>No books finished in this period.</StatsEmpty>
				) : (
					<ol className="flex flex-col gap-1.5">
						{data.topReaders.map((reader) => {
							const row = (
								<>
									<span className="w-6 shrink-0 text-center font-semibold text-sm tabular-nums">
										{reader.rank}
									</span>
									<Avatar className="size-8 shrink-0">
										{reader.image ? (
											<AvatarImage src={reader.image} alt="" />
										) : null}
										<AvatarFallback>
											{reader.name ? reader.name.charAt(0) : "?"}
										</AvatarFallback>
									</Avatar>
									<span className="min-w-0 flex-1 truncate text-sm">
										{reader.name ?? (
											<span className="text-muted-foreground">
												A private member
											</span>
										)}
									</span>
									<span className="shrink-0 font-medium text-sm tabular-nums">
										{books(reader.books)}
									</span>
								</>
							);
							return (
								<li key={reader.rank}>
									{reader.username ? (
										<Link
											href={`/users/${reader.username}/stats` as Route}
											className="flex items-center gap-3 border border-border bg-background px-3 py-2 transition-colors hover:bg-muted/40"
										>
											{row}
										</Link>
									) : (
										<div className="flex items-center gap-3 border border-border bg-background px-3 py-2">
											{row}
										</div>
									)}
								</li>
							);
						})}
					</ol>
				)}
			</StatsSection>
		</div>
	);
}

/* ---------------------------------------------------------------- reading */

export function ClubReadingTab({ data }: { data: ClubStatsReading }) {
	const [metrics, setMetrics] = useCumulativeMetrics();
	const [paceMetric, setPaceMetric] = usePaceMetric();
	const [publicationMode, setPublicationMode] = usePublicationMode();
	const needsDates =
		"Reading over time needs finish dates. Pick All time or a year.";

	return (
		<div className="flex flex-col gap-4">
			<StatsSection
				id="progress"
				title="Reading progress"
				description="The club's totals building up. Several metrics at once are each drawn as a share of their own total."
				actions={
					<SegmentedMulti
						value={metrics}
						onChange={(next) => void setMetrics(next)}
					/>
				}
			>
				{data.progress ? (
					<CumulativeChart points={data.progress} metrics={metrics} />
				) : (
					<StatsEmpty>{needsDates}</StatsEmpty>
				)}
			</StatsSection>

			<StatsSection
				id="pace"
				title="Reading pace"
				description="Books or pages finished each month, with a 3-month average."
				actions={
					<SegmentedControl
						label="Pace metric"
						value={paceMetric}
						options={paceMetrics.map((id) => ({
							id,
							label: id === "books" ? "Books" : "Pages",
						}))}
						onChange={(next) => void setPaceMetric(next)}
					/>
				}
			>
				{data.pace ? (
					<PaceChart series={data.pace.series} metric={paceMetric} />
				) : (
					<StatsEmpty>{needsDates}</StatsEmpty>
				)}
			</StatsSection>

			<StatsSection
				id="reading-time"
				title="Time and sessions"
				description="From Reading Mode sessions, all time."
			>
				<StatRow
					items={[
						{ label: "Time read", value: hours(data.time.seconds) },
						{ label: "Sessions", value: n(data.time.sessions) },
						{ label: "Readers", value: n(data.time.readers) },
						{
							label: "Average session",
							value: hours(data.time.averageSeconds),
						},
					]}
				/>
			</StatsSection>

			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="pages"
					title="Books by page count"
					description="How long the books are."
				>
					<HistogramChart points={data.pages} angled />
				</StatsSection>
				<StatsSection
					id="publication"
					title="Books by publication period"
					description="When the books were first published."
					actions={
						<SegmentedControl
							label="Group by"
							value={publicationMode}
							options={publicationModes.map((id) => ({
								id,
								label:
									id === "year"
										? "Year"
										: id === "decade"
											? "Decade"
											: "Century",
							}))}
							onChange={(next) => void setPublicationMode(next)}
						/>
					}
				>
					<HistogramChart
						points={data.publication[publicationMode]}
						angled={publicationMode === "year"}
					/>
				</StatsSection>
			</div>
		</div>
	);
}

/** Several metrics on at once; at least one stays on. */
function SegmentedMulti({
	value,
	onChange,
}: {
	value: readonly (typeof CUMULATIVE_METRICS)[number][];
	onChange: (next: (typeof CUMULATIVE_METRICS)[number][]) => void;
}) {
	return (
		<div className="inline-flex divide-x divide-border border border-border">
			{CUMULATIVE_METRICS.map((metric) => {
				const on = value.includes(metric);
				return (
					<button
						key={metric}
						type="button"
						aria-pressed={on}
						onClick={() => {
							const next = on
								? value.filter((item) => item !== metric)
								: [...value, metric];
							if (next.length > 0) onChange(next);
						}}
						className={
							on
								? "bg-foreground px-3 py-1.5 text-background text-sm"
								: "px-3 py-1.5 text-muted-foreground text-sm hover:bg-muted/50 hover:text-foreground"
						}
					>
						{METRIC_LABELS[metric]}
					</button>
				);
			})}
		</div>
	);
}

/* ------------------------------------------------------------------ taste */

export function ClubTasteTab({ data }: { data: ClubStatsTaste }) {
	const [subjectView, setSubjectView] = useSubjectView();
	const [authorView, setAuthorView] = useAuthorView();
	const subjectsRated = subjectView === "rated";
	const authorsRated = authorView === "rated";
	const authorRows = authorsRated ? data.authorsRated : data.authors;
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="subjects"
					title="Subjects"
					description={
						subjectsRated
							? "The subjects whose books the club rated highest (at least two rated books)."
							: "What the club reads about, by how many reads carry each subject."
					}
					actions={
						<SegmentedControl
							label="Subjects"
							value={subjectView}
							options={subjectViews.map((id) => ({
								id,
								label: id === "read" ? "Most read" : "Highest rated",
							}))}
							onChange={(next) => void setSubjectView(next)}
						/>
					}
				>
					{subjectsRated ? (
						data.subjectsRated.length === 0 ? (
							<StatsEmpty>Not enough rated books yet.</StatsEmpty>
						) : (
							<RankedBars
								format={(value) => `${value.toFixed(1)}★`}
								rows={data.subjectsRated.map((row) => ({
									label: row.subject,
									value: row.average,
									hint: books(row.count),
								}))}
							/>
						)
					) : data.subjects.length === 0 ? (
						<StatsEmpty>No subjects for these books.</StatsEmpty>
					) : (
						<RankedBars
							rows={data.subjects.map((row) => ({
								label: row.subject,
								value: row.count,
								hint: `${row.percent}% of subject tags`,
							}))}
						/>
					)}
				</StatsSection>
				<StatsSection
					id="authors"
					title="Authors"
					description={
						authorsRated
							? "The authors whose books the club rated highest (at least two rated books)."
							: "The authors the club reads the most."
					}
					actions={
						<SegmentedControl
							label="Authors"
							value={authorView}
							options={authorViews.map((id) => ({
								id,
								label: id === "read" ? "Most read" : "Highest rated",
							}))}
							onChange={(next) => void setAuthorView(next)}
						/>
					}
				>
					{authorRows.length === 0 ? (
						<StatsEmpty>
							{authorsRated
								? "Not enough rated books yet."
								: "No authors to show yet."}
						</StatsEmpty>
					) : (
						<ul className="flex flex-col gap-2">
							{authorRows.map((row) => (
								<li
									key={row.key}
									className="flex items-center gap-3 border border-border bg-background p-2.5"
								>
									<Avatar className="size-10 shrink-0">
										{row.photoUrl ? (
											<AvatarImage src={row.photoUrl} alt="" />
										) : null}
										<AvatarFallback>{row.label.charAt(0)}</AvatarFallback>
									</Avatar>
									{row.slug ? (
										<Link
											href={`/authors/${row.slug}` as Route}
											className="min-w-0 flex-1 truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{row.label}
										</Link>
									) : (
										<span className="min-w-0 flex-1 truncate font-medium text-sm">
											{row.label}
										</span>
									)}
									<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
										{authorsRated && row.average != null
											? `${row.average.toFixed(1)}★ · ${books(row.count)}`
											: `${n(row.count)} reads`}
									</span>
								</li>
							))}
						</ul>
					)}
				</StatsSection>
			</div>

			<StatsSection
				id="countries"
				title="Countries"
				description="Where the books come from."
			>
				{data.countries.rows.length === 0 ? (
					<StatsEmpty>No country data.</StatsEmpty>
				) : (
					<ul className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
						{data.countries.rows.map((row) => (
							<li
								key={row.code}
								className="flex items-center justify-between gap-2 bg-card px-3 py-2.5"
							>
								<CountryLabel
									alpha2={row.code}
									name={getBookCountryName(row.code) ?? row.code}
									className="min-w-0 text-sm"
								/>
								<span className="font-semibold text-xs tabular-nums">
									{n(row.count)}
								</span>
							</li>
						))}
					</ul>
				)}
			</StatsSection>

			<StatsSection
				id="map"
				title="Map"
				description="Each country shaded by how many reads come from it."
			>
				<StatsWorldMap counts={data.countries.map} />
			</StatsSection>

			<StatsSection
				id="series"
				title="Series"
				description="The series the club reads the most."
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
									<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
										{n(row.read)} reads
										{row.total ? ` · ${row.total} books` : ""}
									</span>
								</div>
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

			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="club-rating"
					title="Books by club rating"
					description={
						data.clubRating.average != null
							? `Average club rating ${data.clubRating.average.toFixed(1)}${data.clubRating.topBucket ? `, most often ${data.clubRating.topBucket}` : ""}.`
							: "How the club rated the books."
					}
				>
					<HistogramChart points={data.clubRating.points} />
				</StatsSection>
				<StatsSection
					id="popular"
					title="Most read and best rated"
					description="By readers, and by average rating (at least two)."
				>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Read by the most members
							</h3>
							<ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
								{data.mostRead.map((row) => (
									<li key={row.id}>
										<CoverLink book={row} caption={`${row.readers} read`} />
									</li>
								))}
							</ul>
						</div>
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Best rated
							</h3>
							{data.topRated.length === 0 ? (
								<StatsEmpty>Not enough ratings yet.</StatsEmpty>
							) : (
								<ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
									{data.topRated.map((row) => (
										<li key={row.id}>
											<CoverLink
												book={row}
												caption={`${row.average.toFixed(1)}★ · ${row.ratings}`}
											/>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				</StatsSection>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------- community */

export function ClubCommunityTab({ data }: { data: ClubStatsCommunity }) {
	const { reviews, posts, shelves, friends } = data;
	return (
		<div className="flex flex-col gap-4">
			<StatsSection
				id="reviews"
				title="Reviews"
				description="Ratings and reviews written by the club."
			>
				<StatRow
					items={[
						{ label: "Reviews", value: n(reviews.count) },
						{
							label: "Average rating",
							value:
								reviews.average != null
									? `${reviews.average.toFixed(1)}★`
									: "—",
						},
						{ label: "Likes", value: n(reviews.likes) },
						{ label: "Comments", value: n(reviews.comments) },
					]}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Reviews over time
						</h3>
						<CumulativeArea points={reviews.cumulative} label="Reviews" />
					</div>
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Ratings given
						</h3>
						<HistogramChart points={reviews.spread} label="Ratings" />
					</div>
				</div>
			</StatsSection>

			<StatsSection
				id="posts"
				title="Posts"
				description="What was shared with the club."
			>
				<StatRow
					items={[
						{ label: "Posts", value: n(posts.count) },
						{ label: "Likes", value: n(posts.likes) },
						{ label: "Comments", value: n(posts.comments) },
						{ label: "Polls", value: n(posts.polls) },
						{ label: "Tierlists", value: n(posts.tierlists) },
					]}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Posts over time
						</h3>
						<CumulativeArea points={posts.cumulative} label="Posts" />
					</div>
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Most engaged public posts
						</h3>
						{posts.top.length === 0 ? (
							<StatsEmpty>
								No public post has had a like or a comment yet.
							</StatsEmpty>
						) : (
							<ol className="flex flex-col gap-1.5">
								{posts.top.map((post) => (
									<li key={post.slug}>
										<Link
											href={`/posts/${post.slug}` as Route}
											className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
										>
											<span className="min-w-0 truncate">
												{post.preview || "A post"}
											</span>
											<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
												{post.likes} ♥ · {post.comments} 💬
											</span>
										</Link>
									</li>
								))}
							</ol>
						)}
					</div>
				</div>
			</StatsSection>

			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="shelves"
					title="Shelves"
					description="Shelves made by members."
				>
					<StatRow
						items={[
							{ label: "Shelves", value: n(shelves.count) },
							{ label: "Books on shelves", value: n(shelves.books) },
						]}
					/>
				</StatsSection>
				<StatsSection
					id="friends"
					title="Friends"
					description="Friendships between members."
				>
					<StatRow
						items={[
							{ label: "Friendships", value: n(friends.pairs) },
							{
								label: "Per member",
								value: friends.averagePerMember.toFixed(1),
							},
						]}
					/>
				</StatsSection>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------- club life */

const pct = (value: number | null) => (value == null ? "—" : `${value}%`);

/** Shares as bars with a percentage, for how sittings ended and how people joined. */
function ShareBars({
	rows,
}: {
	rows: readonly { label: string; count: number; percent: number }[];
}) {
	if (rows.every((row) => row.count === 0)) {
		return <StatsEmpty>Nothing to show for this period.</StatsEmpty>;
	}
	return (
		<RankedBars
			rows={rows.map((row) => ({
				label: row.label,
				value: row.count,
				hint: `${row.percent}% of ${n(rows.reduce((sum, r) => sum + r.count, 0))}`,
			}))}
		/>
	);
}

const STATUS_LABELS = {
	voting: "Voting",
	reading: "Reading",
	finished: "Finished",
} as const;

export function ClubLifeStatsTab({ data }: { data: ClubStatsClubLife }) {
	const { sittings, goals, achievements, standing } = data;
	const { summary, comparison } = sittings;
	const before = comparison ? `vs ${comparison.label}` : null;
	const points = comparison?.completionRatePoints ?? null;
	return (
		<div className="flex flex-col gap-4">
			<StatsSection
				id="sittings"
				title="Sittings"
				description={
					comparison
						? `Reading rounds run by the club, compared with ${comparison.label}.`
						: "Reading rounds run by the club."
				}
				actions={
					comparison ? (
						<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
							<span className="inline-flex items-center gap-1">
								Sittings <ChangeChip change={comparison.sittings} />
							</span>
							<span className="inline-flex items-center gap-1">
								Participations <ChangeChip change={comparison.participations} />
							</span>
							<span className="inline-flex items-center gap-1">
								People <ChangeChip change={comparison.participants} />
							</span>
						</div>
					) : null
				}
			>
				<StatRow
					items={[
						{ label: "Sittings", value: n(summary.total), hint: before },
						{
							label: "Finished",
							value: n(summary.finished),
							hint: `${n(summary.reading)} reading · ${n(summary.voting)} voting`,
						},
						{
							label: "Participations",
							value: n(summary.participations),
							hint: `${n(summary.participants)} different members`,
						},
						{
							label: "Per sitting",
							value: summary.averageParticipants.toFixed(1),
							hint: "average participants",
						},
						{
							label: "Completion rate",
							value: pct(summary.completionRate),
							hint:
								points != null && points !== 0
									? `${points > 0 ? "+" : "−"}${Math.abs(points)} pts ${before}`
									: "of those that ended",
						},
						{
							label: "Did not finish",
							value: pct(summary.dnfRate),
							hint: `${n(summary.didNotFinish)} participations`,
						},
						{
							label: "Completed",
							value: n(summary.completed),
							hint: "participations",
						},
						{
							label: "Still reading",
							value: n(summary.inProgress + summary.notStarted),
							hint: `${n(summary.notStarted)} not started`,
						},
						{
							label: "Votes cast",
							value: n(summary.votes),
							hint: `${n(summary.voters)} voters`,
						},
						{
							label: "Voting turnout",
							value: pct(summary.turnout),
							hint: "of those who joined",
						},
						{
							label: "Votes per sitting",
							value: summary.averageVotesPerSitting.toFixed(1),
							hint: "average",
						},
						{
							label: "Average book",
							value:
								summary.averageBookPages != null
									? `${n(summary.averageBookPages)} pages`
									: "—",
							hint: summary.longestBook
								? `longest ${n(summary.longestBook.pages)}`
								: null,
						},
					]}
				/>
			</StatsSection>

			<StatsSection
				id="sittings-over-time"
				title="Sittings over time"
				description="Sittings started each month, and how many people joined them."
			>
				<GroupedBarsChart
					points={sittings.monthly.map((month) => ({
						label: month.label,
						first: month.sittings,
						second: month.joined,
					}))}
					first="Sittings"
					second="People joined"
				/>
			</StatsSection>

			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="sitting-outcomes"
					title="How people finished"
					description="Every participation, by where it ended up."
				>
					<ShareBars rows={sittings.progress} />
				</StatsSection>
				<StatsSection
					id="sitting-sizes"
					title="Sitting sizes"
					description="How many sittings had this many people."
				>
					<HistogramChart
						points={sittings.sizes}
						label="Sittings"
						className="h-44"
					/>
				</StatsSection>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<StatsSection
					id="sitting-joins"
					title="Who can join"
					description="Sittings by join type."
				>
					<ShareBars rows={sittings.joinTypes} />
				</StatsSection>
				<StatsSection
					id="sitting-sources"
					title="How people joined"
					description="Participations by the way the member came in."
				>
					<ShareBars rows={sittings.joinSources} />
				</StatsSection>
			</div>

			<StatsSection
				id="sitting-books"
				title="Books chosen"
				description={
					summary.shortestBook && summary.longestBook
						? `Shortest: ${summary.shortestBook.title} (${n(summary.shortestBook.pages)} pages). Longest: ${summary.longestBook.title} (${n(summary.longestBook.pages)} pages).`
						: "How long the books the club chose are."
				}
			>
				<HistogramChart
					points={sittings.pages}
					label="Sittings"
					className="h-44"
				/>
			</StatsSection>

			<StatsSection
				id="recent-sittings"
				title="Public sittings"
				description="The latest public sittings in this period. Private and unlisted ones are never named."
			>
				{sittings.recent.length === 0 ? (
					<StatsEmpty>No public sittings in this period.</StatsEmpty>
				) : (
					<ul className="grid gap-3 md:grid-cols-2">
						{sittings.recent.map((row) => (
							<li key={row.slug}>
								<Link
									href={`/sittings/${row.slug}` as Route}
									className="flex items-center gap-3 border border-border bg-background p-3 transition-colors hover:bg-muted/40"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-sm">
											{row.bookTitle ?? "Book not chosen yet"}
										</p>
										<p className="text-muted-foreground text-xs">
											{STATUS_LABELS[row.status]} · {n(row.participants)}{" "}
											{row.participants === 1 ? "member" : "members"}
										</p>
									</div>
									<div className="shrink-0 text-end">
										<p className="font-semibold text-sm tabular-nums">
											{pct(row.rate)}
										</p>
										<p className="text-2xs text-muted-foreground">
											{n(row.completed)} finished
										</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</StatsSection>

			<StatsSection
				id="top-finishers"
				title="Most sittings finished"
				description="Members who finished the most sittings. Private profiles are shown without a name."
			>
				{sittings.topFinishers.length === 0 ? (
					<StatsEmpty>Nobody has finished a sitting in this period.</StatsEmpty>
				) : (
					<ol className="grid gap-2 md:grid-cols-2">
						{sittings.topFinishers.map((row) => (
							<li
								key={row.rank}
								className="flex items-center gap-3 border border-border bg-background p-2.5"
							>
								<span className="w-6 shrink-0 text-center font-semibold text-muted-foreground text-xs tabular-nums">
									{row.rank}
								</span>
								<Avatar className="size-8 shrink-0">
									{row.image ? <AvatarImage src={row.image} alt="" /> : null}
									<AvatarFallback>{row.name?.charAt(0) ?? "?"}</AvatarFallback>
								</Avatar>
								{row.username ? (
									<Link
										href={`/users/${row.username}` as Route}
										className="min-w-0 flex-1 truncate font-medium text-sm underline-offset-4 hover:underline"
									>
										{row.name ?? row.username}
									</Link>
								) : (
									<span className="min-w-0 flex-1 truncate text-muted-foreground text-sm">
										A member
									</span>
								)}
								<span className="shrink-0 text-xs tabular-nums">
									{n(row.count)} finished
								</span>
							</li>
						))}
					</ol>
				)}
			</StatsSection>

			<StatsSection
				id="goals"
				title="Goals"
				description={`Goals set for ${goals.year}.`}
			>
				<StatRow
					items={[
						{ label: "Goals set", value: n(goals.set) },
						{ label: "Members with a goal", value: n(goals.members) },
					]}
				/>
			</StatsSection>

			<StatsSection
				id="achievements"
				title="Achievements"
				description="What members have earned."
			>
				<StatRow
					items={[
						{ label: "Awards", value: n(achievements.awards) },
						{ label: "Members with one", value: n(achievements.members) },
					]}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Most earned
						</h3>
						<RankedBars
							rows={achievements.mostEarned.map((row) => ({
								label: row.name,
								value: row.earnedBy,
							}))}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Rarest
						</h3>
						{achievements.rarest.length === 0 ? (
							<StatsEmpty>Nothing earned yet.</StatsEmpty>
						) : (
							<RankedBars
								rows={achievements.rarest.map((row) => ({
									label: row.name,
									value: row.earnedBy,
								}))}
							/>
						)}
					</div>
				</div>
			</StatsSection>

			<StatsSection
				id="standing"
				title="XP and levels"
				description="Points earned across the club, and how members spread over the levels."
			>
				<StatRow
					items={[
						{ label: "XP", value: n(standing.totalXp) },
						{ label: "RP", value: n(standing.totalRp) },
					]}
				/>
				<HistogramChart
					points={standing.levels}
					label="Members"
					className="h-44"
				/>
			</StatsSection>
		</div>
	);
}
