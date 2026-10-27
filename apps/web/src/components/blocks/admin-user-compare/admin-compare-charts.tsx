"use client";

import type { CompareStatsOutput } from "@bbrc/api/modules/user-compare-admin/user-compare-admin.schema";
import { describeScoreBand } from "@bbrc/shared";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Slider } from "@bbrc/ui/components/slider";
import type { Route } from "next";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	Scatter,
	ScatterChart,
	XAxis,
	YAxis,
	ZAxis,
} from "recharts";
import {
	ChartEmpty,
	ChartFrame,
	formatNumber,
} from "@/components/blocks/author/author-stats-frame";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link, useRouter } from "@/i18n/navigation";

type Stats = CompareStatsOutput;

const BAND_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const histogramConfig = { count: { label: "Pairs", color: "var(--chart-1)" } };
const scatterConfig = {
	meanSimilarity: { label: "Mean score", color: "var(--chart-2)" },
};

/** How many pairs fall in each band of ten points. */
export function ScoreHistogram({ stats }: { stats: Stats }) {
	const data = stats.scoreDistribution.map((bucket) => ({
		label: `${bucket.from}–${bucket.to}`,
		count: bucket.count,
	}));
	const total = data.reduce((sum, row) => sum + row.count, 0);

	return (
		<ChartFrame
			title="How scores are spread"
			description="Pairs of members by their score, in steps of ten points."
			table={{
				columns: ["Score", "Pairs"],
				rows: data.map((row) => [row.label, row.count]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty>No pairs to chart yet.</ChartEmpty>
			) : (
				<ChartContainer
					config={histogramConfig}
					className="aspect-auto h-64 w-full"
					role="img"
					aria-label={`Histogram of ${total} pair scores in ten buckets`}
				>
					<BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey="label" tickLine={false} axisLine={false} />
						<YAxis
							allowDecimals={false}
							tickLine={false}
							axisLine={false}
							width={32}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent labelFormatter={(l) => `Score ${l}`} />
							}
						/>
						<Bar dataKey="count" fill="var(--color-count)" />
					</BarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

/** Each member as a dot: how much they read against how close they are to the rest of the club. */
export function MembersScatter({ stats }: { stats: Stats }) {
	const router = useRouter();
	const data = stats.membersScatter.map((row) => ({
		username: row.user.username,
		name: row.user.name,
		booksRead: row.booksRead,
		meanSimilarity: row.meanSimilarity,
		topSimilarity: row.topSimilarity,
	}));

	return (
		<ChartFrame
			title="Reading a lot, reading alike"
			description="Books read against the mean score with everyone else. Click a dot to open the member."
			table={{
				columns: ["Member", "Books read", "Mean score", "Top 5 mean"],
				rows: data.map((row) => [
					row.name,
					row.booksRead,
					row.meanSimilarity.toFixed(1),
					row.topSimilarity.toFixed(1),
				]),
			}}
		>
			{data.length === 0 ? (
				<ChartEmpty>No members to chart yet.</ChartEmpty>
			) : (
				<ChartContainer
					config={scatterConfig}
					className="aspect-auto h-72 w-full"
					role="img"
					aria-label={`Scatter plot of ${data.length} members`}
				>
					<ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
						<CartesianGrid />
						<XAxis
							type="number"
							dataKey="booksRead"
							name="Books read"
							tickLine={false}
							axisLine={false}
							allowDecimals={false}
						/>
						<YAxis
							type="number"
							dataKey="meanSimilarity"
							name="Mean score"
							domain={[0, 100]}
							tickLine={false}
							axisLine={false}
							width={32}
						/>
						<ZAxis range={[70, 70]} />
						<ChartTooltip
							cursor={{ strokeDasharray: "3 3" }}
							content={
								<ChartTooltipContent
									hideIndicator
									labelFormatter={(_, payload) =>
										payload?.[0]?.payload?.name ?? ""
									}
								/>
							}
						/>
						<Scatter
							data={data}
							fill="var(--color-meanSimilarity)"
							className="cursor-pointer"
							onClick={(point: {
								username?: string;
								payload?: { username?: string };
							}) => {
								const username = point.payload?.username ?? point.username;
								if (username) router.push(`/users/${username}` as Route);
							}}
						/>
					</ScatterChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

/** The matrix pairs counted by how the compare page describes them ("Reading twins" and so on). */
export function BandBreakdown({ stats }: { stats: Stats }) {
	const { members, scores } = stats.matrix;
	const rows = useMemo(() => {
		const counts = new Map<string, { label: string; count: number }>();
		for (let i = 0; i < members.length; i++) {
			for (let j = i + 1; j < members.length; j++) {
				const score = scores[i]?.[j];
				if (score == null) continue;
				const band = describeScoreBand(score);
				const row = counts.get(band.key) ?? { label: band.label, count: 0 };
				row.count += 1;
				counts.set(band.key, row);
			}
		}
		return [
			"twins",
			"very_similar",
			"some_overlap",
			"different",
			"none",
		].flatMap((key) => {
			const row = counts.get(key);
			return row ? [row] : [];
		});
	}, [members.length, scores]);
	const total = rows.reduce((sum, row) => sum + row.count, 0);
	const config = Object.fromEntries(
		rows.map((row, index) => [
			row.label,
			{ label: row.label, color: BAND_COLORS[index % BAND_COLORS.length] },
		]),
	);

	return (
		<ChartFrame
			title="How pairs describe themselves"
			description={`The ${total} pairs in the matrix, by the label the compare page gives them.`}
			table={{
				columns: ["Band", "Pairs"],
				rows: rows.map((row) => [row.label, row.count]),
			}}
		>
			{total === 0 ? (
				<ChartEmpty>No pairs to chart yet.</ChartEmpty>
			) : (
				<div className="flex flex-col items-center gap-4 sm:flex-row">
					<ChartContainer
						config={config}
						className="aspect-square h-48 shrink-0"
						role="img"
						aria-label={`Pairs by band: ${rows.map((row) => `${row.label} ${row.count}`).join(", ")}`}
					>
						<PieChart>
							<ChartTooltip content={<ChartTooltipContent hideLabel />} />
							<Pie
								data={rows}
								dataKey="count"
								nameKey="label"
								innerRadius={48}
								strokeWidth={2}
							>
								{rows.map((row, index) => (
									<Cell
										key={row.label}
										fill={BAND_COLORS[index % BAND_COLORS.length]}
									/>
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<ul className="flex w-full flex-col gap-1.5 text-sm">
						{rows.map((row, index) => (
							<li key={row.label} className="flex items-center gap-2">
								<span
									aria-hidden
									className="size-2.5 shrink-0"
									style={{
										backgroundColor: BAND_COLORS[index % BAND_COLORS.length],
									}}
								/>
								<span className="flex-1 truncate">{row.label}</span>
								<span className="text-muted-foreground tabular-nums">
									{formatNumber(row.count)}{" "}
									<span className="text-xs">
										({Math.round((row.count / total) * 100)}%)
									</span>
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</ChartFrame>
	);
}

type Circle = { members: Stats["matrix"]["members"]; mean: number };

/** Groups of members who are all linked by scores at or above the slider's value. */
function findCircles(matrix: Stats["matrix"], threshold: number): Circle[] {
	const { members, scores } = matrix;
	const parent = members.map((_, index) => index);
	const find = (index: number): number => {
		let root = index;
		while (parent[root] !== root) root = parent[root] ?? root;
		return root;
	};
	for (let i = 0; i < members.length; i++) {
		for (let j = i + 1; j < members.length; j++) {
			const score = scores[i]?.[j];
			if (score != null && score >= threshold) {
				parent[find(i)] = find(j);
			}
		}
	}
	const groups = new Map<number, number[]>();
	members.forEach((_, index) => {
		const root = find(index);
		groups.set(root, [...(groups.get(root) ?? []), index]);
	});

	return [...groups.values()]
		.filter((indexes) => indexes.length > 1)
		.map((indexes) => {
			let sum = 0;
			let count = 0;
			for (const i of indexes) {
				for (const j of indexes) {
					const score = scores[i]?.[j];
					if (j > i && score != null) {
						sum += score;
						count += 1;
					}
				}
			}
			return {
				members: indexes.flatMap((index) => {
					const member = members[index];
					return member ? [member] : [];
				}),
				mean: count > 0 ? sum / count : 0,
			};
		})
		.sort((a, b) => b.members.length - a.members.length || b.mean - a.mean);
}

/** Reading circles: raise the bar to see who stays together. */
export function ReadingCircles({ stats }: { stats: Stats }) {
	const [threshold, setThreshold] = useState(60);
	const circles = useMemo(
		() => findCircles(stats.matrix, threshold),
		[stats.matrix, threshold],
	);
	const grouped = circles.reduce(
		(sum, circle) => sum + circle.members.length,
		0,
	);
	const alone = stats.matrix.members.length - grouped;

	return (
		<ChartFrame
			title="Reading circles"
			description="Members who are linked, directly or through someone else, by a score at or above the line you set."
			actions={
				<div className="flex w-full max-w-56 items-center gap-3 sm:w-56">
					<Slider
						min={20}
						max={95}
						step={5}
						value={[threshold]}
						aria-label="Lowest score that links two members"
						onValueChange={(value) =>
							setThreshold(Array.isArray(value) ? (value[0] ?? 60) : value)
						}
					/>
					<span className="w-8 text-right font-medium text-sm tabular-nums">
						{threshold}
					</span>
				</div>
			}
			footer={
				<p className="text-muted-foreground text-xs">
					{circles.length === 0
						? "Nobody is linked at this score."
						: `${grouped} members in ${circles.length} ${circles.length === 1 ? "circle" : "circles"}, ${alone} on their own.`}{" "}
					Based on the members in the matrix.
				</p>
			}
		>
			{circles.length === 0 ? (
				<ChartEmpty>Lower the score to link members.</ChartEmpty>
			) : (
				<ul className="flex flex-col gap-2">
					{circles.map((circle) => (
						<li
							key={circle.members.map((member) => member.username).join("|")}
							className="flex items-center gap-3 border border-border p-2.5"
						>
							<span className="flex shrink-0 -space-x-2" aria-hidden>
								{circle.members.slice(0, 5).map((member) => (
									<UserAvatar
										key={member.username}
										user={member}
										className="size-7 ring-2 ring-card"
									/>
								))}
							</span>
							<span className="min-w-0 flex-1 text-sm">
								{circle.members.map((member, index) => (
									<span key={member.username}>
										{index > 0 ? ", " : ""}
										<Link
											href={`/users/${member.username}` as Route}
											className="hover:underline"
										>
											{member.name}
										</Link>
									</span>
								))}
							</span>
							<span className="shrink-0 text-right text-muted-foreground text-xs">
								<span className="block font-medium text-foreground text-sm tabular-nums">
									{circle.mean.toFixed(0)}
								</span>
								average
							</span>
						</li>
					))}
				</ul>
			)}
		</ChartFrame>
	);
}
