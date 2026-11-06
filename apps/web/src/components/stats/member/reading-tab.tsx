"use client";

import type { MemberStatsReadingOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import { CUMULATIVE_METRICS, type CumulativeMetric } from "@bbrc/shared";
import { ChoiceGroup } from "@/components/blocks/preferences-ui";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import {
	paceMetrics,
	publicationModes,
	useCumulativeMetrics,
	usePaceMetric,
	usePublicationMode,
} from "@/lib/stats/stats-params";
import { cn } from "@/lib/utils";
import {
	CumulativeChart,
	HistogramChart,
	METRIC_LABELS,
	PaceChart,
} from "../stats-charts";
import {
	StatRow,
	type StatRowItem,
	StatsEmpty,
	StatsSection,
} from "../stats-kit";

const needsDates =
	"Reading over time needs finish dates. Pick All time or a year.";

/** Switch several metrics on and off; at least one stays on. */
function MetricChips({
	value,
	onChange,
}: {
	value: readonly CumulativeMetric[];
	onChange: (next: CumulativeMetric[]) => void;
}) {
	return (
		<ChoiceGroup
			label="Metrics to draw"
			className="inline-flex divide-x divide-border border border-border"
		>
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
						className={cn(
							"px-3 py-1.5 text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
							on
								? "bg-foreground text-background"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						{METRIC_LABELS[metric]}
					</button>
				);
			})}
		</ChoiceGroup>
	);
}

function formatDuration(seconds: number): string {
	if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
	return `${(seconds / 3600).toFixed(seconds >= 360_000 ? 0 : 1)} h`;
}

function timeItems(
	time: NonNullable<MemberStatsReadingOutput["time"]>,
): StatRowItem[] {
	const base: StatRowItem[] = [
		{ label: "Time read", value: formatDuration(time.seconds) },
		{ label: "Sessions", value: String(time.sessions) },
		{ label: "Books", value: String(time.books) },
		{ label: "Average session", value: formatDuration(time.averageSeconds) },
		{
			label: "Reading streak",
			value: `${time.currentStreak} ${time.currentStreak === 1 ? "day" : "days"}`,
			hint: time.kind === "full" ? `best ${time.longestStreak}` : null,
		},
	];
	if (time.kind === "numbers") return base;
	return [
		...base,
		{ label: "Longest session", value: formatDuration(time.longestSeconds) },
		{ label: "Days read", value: String(time.activeDays) },
		...(time.pagesGained != null
			? [
					{
						label: "Pages in sessions",
						value: time.pagesGained.toLocaleString("en-US"),
					},
				]
			: []),
		...(time.usualSpeed != null
			? [
					{
						label: "Usual speed",
						value: `${Math.round(time.usualSpeed)} pages/h`,
					},
				]
			: []),
	];
}

export function ReadingTab({ data }: { data: MemberStatsReadingOutput }) {
	const [metrics, setMetrics] = useCumulativeMetrics();
	const [paceMetric, setPaceMetric] = usePaceMetric();
	const [publicationMode, setPublicationMode] = usePublicationMode();

	const year = data.pace?.year ?? null;

	return (
		<div className="flex flex-col gap-4">
			{data.access.reads ? (
				<StatsSection
					id="progress"
					title="Reading progress"
					description="Totals building up over time. Pick several metrics to compare their shapes: each is then drawn as a share of its own total."
					actions={
						<MetricChips
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
			) : null}

			{data.access.reads ? (
				<StatsSection
					id="pace"
					title="Reading pace"
					description="How much is finished each month, with a 3-month average to smooth the lumpy ones."
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
					{year ? (
						<StatRow
							items={[
								{
									label: `${year.year} so far`,
									value:
										paceMetric === "books"
											? `${year.books} books`
											: `${year.pages.toLocaleString("en-US")} pages`,
								},
								...(year.projectedBooks != null
									? [
											{
												label: "At this pace",
												value:
													paceMetric === "books"
														? `${year.projectedBooks} books`
														: `${(year.projectedPages ?? 0).toLocaleString("en-US")} pages`,
												hint: "by December",
											},
										]
									: []),
								{
									label: `${year.year - 1}`,
									value:
										paceMetric === "books"
											? `${year.previousYearBooks} books`
											: `${year.previousYearPages.toLocaleString("en-US")} pages`,
								},
							]}
						/>
					) : null}
					{data.pace ? (
						<PaceChart series={data.pace.series} metric={paceMetric} />
					) : (
						<StatsEmpty>{needsDates}</StatsEmpty>
					)}
				</StatsSection>
			) : null}

			{data.time ? (
				<StatsSection
					id="reading-time"
					title="Time and sessions"
					description={
						data.time.kind === "numbers"
							? "Totals over all time. The details are private."
							: "From Reading Mode sessions."
					}
				>
					<StatRow items={timeItems(data.time)} />
				</StatsSection>
			) : null}

			{data.access.reads ? (
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
			) : null}
		</div>
	);
}
