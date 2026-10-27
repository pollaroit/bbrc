"use client";

import type { PollStats as PollStatsData } from "@bbrc/api/modules/post-poll/post-poll.schema";
import {
	contentPlainText,
	POST_POLL_BALLOT_LABELS,
	POST_POLL_RESULTS_LABELS,
	POST_POLL_TYPE_LABELS,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import type { Route } from "next";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { PollOptionContent } from "@/components/blocks/poll-option-content";
import {
	type PollVoterRow,
	PollVotersDialog,
} from "@/components/blocks/poll-voters-dialog";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import { formatTimeLeft, percent } from "@/lib/poll/format";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const timelineConfig = {
	voters: { label: "New voters", color: "var(--chart-2)" },
	cumulative: { label: "Total voters", color: "var(--chart-1)" },
} satisfies ChartConfig;

const hoursConfig = {
	voters: { label: "Voters", color: "var(--chart-3)" },
} satisfies ChartConfig;

function Panel({
	title,
	hint,
	children,
	className,
}: {
	title: string;
	hint?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex flex-col gap-4 border border-border bg-card p-4 sm:p-5",
				className,
			)}
		>
			<div className="flex flex-col gap-0.5">
				<h2 className="font-semibold text-base">{title}</h2>
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</div>
			{children}
		</section>
	);
}

function Kpi({
	label,
	value,
	hint,
}: {
	label: string;
	value: React.ReactNode;
	hint?: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5 bg-card p-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="truncate font-heading font-semibold text-2xl tabular-nums">
				{value}
			</span>
			{hint ? (
				<span className="truncate text-muted-foreground text-xs">{hint}</span>
			) : null}
		</div>
	);
}

function dayLabel(day: string) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${day}T12:00:00Z`));
}

function StatsSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-hidden>
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-72 w-full" />
		</div>
	);
}

function Denied({ postSlug }: { postSlug: string }) {
	return (
		<div className="mx-auto flex max-w-xl flex-col items-start gap-3 border border-border p-6">
			<Lock className="size-5 text-muted-foreground" aria-hidden />
			<p className="font-heading font-semibold text-lg">
				Only the poll owner and admins can see these stats.
			</p>
			<p className="text-muted-foreground text-sm">
				You can still vote and see the results the owner allows on the post.
			</p>
			<Button
				render={<Link href={`/posts/${postSlug}` as Route} />}
				nativeButton={false}
				variant="outline"
				size="sm"
			>
				Back to the post
			</Button>
		</div>
	);
}

export function PollStats({ postSlug }: { postSlug: string }) {
	const query = useQuery({
		...orpc.postPoll.stats.queryOptions({ input: { postSlug } }),
		retry: false,
	});
	const [closing, setClosing] = useState(false);
	const [votersForId, setVotersForId] = useState<string | null>(null);

	const closeMutation = useMutation(
		orpc.postPoll.close.mutationOptions({
			onSuccess: async () => {
				setClosing(false);
				toast.success("Poll closed.");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.postPoll.stats.key(),
					}),
					queryClient.invalidateQueries({ queryKey: orpc.postPoll.get.key() }),
					queryClient.invalidateQueries({
						queryKey: orpc.post.getPostList.key(),
					}),
				]);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const data = query.data;

	const derived = useMemo(() => {
		if (!data) return null;
		const { poll } = data;
		const labels = new Map(poll.options.map((option) => [option.id, option]));
		const ranking = poll.type === "ranking";
		const rows = [...poll.options]
			.map((option) => ({ option, result: option.result }))
			.sort(
				(a, b) =>
					(b.result?.points ?? 0) - (a.result?.points ?? 0) ||
					(b.result?.voters ?? 0) - (a.result?.voters ?? 0) ||
					a.option.position - b.option.position,
			);
		const top = Math.max(
			1,
			...rows.map(
				(row) => (ranking ? row.result?.points : row.result?.voters) ?? 0,
			),
		);
		const maxCell = Math.max(
			1,
			...(data.rankMatrix?.flatMap((row) => row.positions) ?? [0]),
		);
		const hours = data.hours.map((voters, hour) => ({
			hour: String(hour).padStart(2, "0"),
			voters,
		}));
		const peak = Math.max(...data.hours);
		const peakHour = peak > 0 ? data.hours.indexOf(peak) : null;
		return { poll, labels, ranking, rows, top, maxCell, hours, peakHour };
	}, [data]);

	if (query.isPending) return <StatsSkeleton />;

	if (query.isError || !data || !derived) {
		return (
			<div className="mx-auto w-full max-w-4xl">
				<Denied postSlug={postSlug} />
			</div>
		);
	}

	const { poll, labels, ranking, rows, top, maxCell, hours, peakHour } =
		derived;
	const excerpt = contentPlainText(data.post.content).trim();
	const ballotLabel = POST_POLL_BALLOT_LABELS[poll.ballotVisibility];
	const resultsLabel = POST_POLL_RESULTS_LABELS[poll.resultsVisibility];
	const empty = data.totalVoters === 0;
	const canListVoters = data.voters?.some((voter) => voter.choices != null);

	function votersOf(optionId: string): PollVoterRow[] {
		return (data?.voters ?? [])
			.filter((voter) => voter.choices?.includes(optionId))
			.map((voter) => ({
				username: voter.username,
				name: voter.name,
				image: voter.image,
				rank:
					poll.type === "ranking"
						? (voter.choices?.indexOf(optionId) ?? -1) + 1
						: null,
				votedAt: voter.votedAt,
			}))
			.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
	}
	const votersFor = votersForId ? labels.get(votersForId) : null;

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			<header className="flex flex-col gap-4 border border-border bg-card p-4 sm:p-6">
				<Link
					href={`/posts/${postSlug}` as Route}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Back to the post
				</Link>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex min-w-0 flex-col gap-2">
						<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
							Poll stats
						</h1>
						<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
							{excerpt.length > 160 ? `${excerpt.slice(0, 159)}…` : excerpt}
						</p>
					</div>
					{!poll.ended ? (
						<Button
							type="button"
							variant="outline"
							className="shrink-0"
							onClick={() => setClosing(true)}
						>
							Close poll
						</Button>
					) : null}
				</div>
				<ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
					<li className="font-medium">
						{poll.ended
							? "Ended"
							: poll.deadline
								? `Open · ${formatTimeLeft(poll.deadline)}`
								: "Open · no deadline"}
					</li>
					<li className="text-muted-foreground">
						{POST_POLL_TYPE_LABELS[poll.type]}
					</li>
					<li className="text-muted-foreground">
						Results: {resultsLabel.label.toLowerCase()}
					</li>
					<li className="text-muted-foreground">
						Ballots: {ballotLabel.label}
					</li>
				</ul>
			</header>

			<div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-5">
				<Kpi label="Voters" value={data.totalVoters.toLocaleString()} />
				<Kpi
					label="Turnout"
					value={percent(data.turnoutRate)}
					hint={`of ${data.eligibleMembers.toLocaleString()} members`}
				/>
				<Kpi
					label={ranking ? "Ranked picks" : "Selections"}
					value={data.totalSelections.toLocaleString()}
				/>
				<Kpi
					label="Changed their vote"
					value={data.changedVotes.toLocaleString()}
					hint={
						data.totalChanges > 0
							? `${data.totalChanges.toLocaleString()} ${data.totalChanges === 1 ? "change" : "changes"} in all`
							: "Nobody yet"
					}
				/>
				<Kpi
					label="Voting window"
					value={
						data.firstVoteAt ? (
							<RelativeTime
								date={data.firstVoteAt}
								className="font-heading font-semibold text-base"
							/>
						) : (
							"—"
						)
					}
					hint={
						data.lastVoteAt ? (
							<>
								last <RelativeTime date={data.lastVoteAt} className="text-xs" />
							</>
						) : undefined
					}
				/>
			</div>

			{empty ? (
				<p className="border border-border border-dashed px-4 py-12 text-center text-muted-foreground text-sm">
					Nobody has voted yet. The charts fill in as votes arrive.
				</p>
			) : null}

			<Panel
				title="Results"
				hint={
					ranking
						? "Ranked by Borda points: first place earns the most. Average position is where it landed, 1 is best."
						: "Share of voters who picked each option."
				}
			>
				<ol className="flex flex-col divide-y divide-border">
					{rows.map(({ option, result }, index) => {
						const value = ranking
							? (result?.points ?? 0)
							: (result?.voters ?? 0);
						return (
							<li
								key={option.id}
								className="grid gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
							>
								<div className="flex min-w-0 items-center gap-3">
									<span className="w-5 shrink-0 text-center font-heading text-muted-foreground tabular-nums">
										{index + 1}
									</span>
									<PollOptionContent option={option} className="flex-1" />
								</div>
								<div className="flex flex-col gap-1.5">
									<div
										className="h-2.5 bg-muted"
										role="img"
										aria-label={`${percent(result?.share ?? 0)} of ${ranking ? "points" : "voters"}`}
									>
										<div
											className="h-full bg-primary"
											style={{ width: `${(value / top) * 100}%` }}
										/>
									</div>
									<p className="flex flex-wrap items-baseline gap-x-3 text-muted-foreground text-xs tabular-nums">
										<span className="font-semibold text-base text-foreground">
											{percent(result?.share ?? 0)}
										</span>
										{canListVoters && (result?.voters ?? 0) > 0 ? (
											<button
												type="button"
												onClick={() => setVotersForId(option.id)}
												className="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
											>
												{result?.voters ?? 0}{" "}
												{result?.voters === 1 ? "voter" : "voters"}
											</button>
										) : (
											<span
												title={
													(result?.voters ?? 0) > 0
														? "Ballot privacy keeps who chose what private."
														: undefined
												}
											>
												{result?.voters ?? 0}{" "}
												{result?.voters === 1 ? "voter" : "voters"}
											</span>
										)}
										{ranking && result ? (
											<>
												<span>{result.points} points</span>
												<span>{result.firstChoices} first</span>
												{result.voters > 0 ? (
													<span>
														avg position{" "}
														{(result.rankSum / result.voters).toFixed(1)}
													</span>
												) : null}
											</>
										) : null}
									</p>
								</div>
							</li>
						);
					})}
				</ol>
			</Panel>

			{data.rankMatrix ? (
				<Panel
					title="Where each option landed"
					hint="How many ballots put each option at each position. Darker means more."
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-96 border-collapse text-sm">
							<thead>
								<tr>
									<th className="p-2 text-start font-normal text-muted-foreground text-xs">
										Option
									</th>
									{Array.from({ length: poll.maxChoices }, (_, index) => (
										<th
											key={index}
											className="w-14 p-2 text-center font-normal text-muted-foreground text-xs tabular-nums"
										>
											#{index + 1}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.rankMatrix.map((row) => {
									const option = labels.get(row.optionId);
									return (
										<tr key={row.optionId} className="border-border border-t">
											<td className="max-w-48 truncate p-2">
												{option?.label ?? "Removed option"}
											</td>
											{row.positions.map((count, index) => (
												<td key={index} className="p-1">
													<div
														className="grid h-9 place-items-center border border-border text-xs tabular-nums"
														style={{
															backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round((count / maxCell) * 85)}%, transparent)`,
														}}
													>
														<span
															className={
																count / maxCell > 0.55
																	? "text-primary-foreground"
																	: ""
															}
														>
															{count}
														</span>
													</div>
												</td>
											))}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</Panel>
			) : null}

			<div className="grid gap-6 lg:grid-cols-2">
				<Panel
					title="Votes over time"
					hint="New voters per day and the running total."
				>
					{data.timeline.length < 2 ? (
						<p className="text-muted-foreground text-sm">
							{data.timeline.length === 0
								? "No votes yet."
								: "All votes so far came on one day, so there is no trend to draw yet."}
						</p>
					) : (
						<ChartContainer config={timelineConfig} className="h-56 w-full">
							<ComposedChart
								data={data.timeline.map((point) => ({
									...point,
									label: dayLabel(point.day),
								}))}
							>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									minTickGap={24}
								/>
								<YAxis
									allowDecimals={false}
									width={28}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="voters" fill="var(--color-voters)" />
								<Line
									dataKey="cumulative"
									type="monotone"
									stroke="var(--color-cumulative)"
									strokeWidth={2}
									dot={false}
								/>
							</ComposedChart>
						</ChartContainer>
					)}
				</Panel>

				<Panel
					title="Time of day"
					hint={
						peakHour != null
							? `Votes by first-vote hour, club time. Busiest around ${String(peakHour).padStart(2, "0")}:00.`
							: "Votes by first-vote hour, club time."
					}
				>
					{empty ? (
						<p className="text-muted-foreground text-sm">No votes yet.</p>
					) : (
						<ChartContainer config={hoursConfig} className="h-56 w-full">
							<BarChart data={hours}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="hour"
									tickLine={false}
									axisLine={false}
									interval={2}
								/>
								<YAxis
									allowDecimals={false}
									width={28}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent />} />
								<Bar dataKey="voters" fill="var(--color-voters)" />
							</BarChart>
						</ChartContainer>
					)}
				</Panel>
			</div>

			{poll.type !== "single" && data.ballotSizes.length > 0 ? (
				<Panel
					title="Ballot sizes"
					hint={`How many options people ${ranking ? "ranked" : "picked"}.`}
				>
					<ul className="flex flex-col gap-2">
						{data.ballotSizes.map((entry) => {
							const most = Math.max(...data.ballotSizes.map((e) => e.ballots));
							return (
								<li
									key={entry.size}
									className="flex items-center gap-3 text-sm"
								>
									<span className="w-20 shrink-0 text-muted-foreground tabular-nums">
										{entry.size} {entry.size === 1 ? "option" : "options"}
									</span>
									<div className="h-2.5 flex-1 bg-muted">
										<div
											className="h-full bg-primary"
											style={{ width: `${(entry.ballots / most) * 100}%` }}
										/>
									</div>
									<span className="w-12 shrink-0 text-end tabular-nums">
										{entry.ballots}
									</span>
								</li>
							);
						})}
					</ul>
				</Panel>
			) : null}

			{data.addedOptions.length > 0 ? (
				<Panel title="Options added by members">
					<ul className="divide-y divide-border">
						{data.addedOptions.map((entry) => (
							<li
								key={entry.optionId}
								className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm first:pt-0 last:pb-0"
							>
								<span className="min-w-0 flex-1 truncate font-medium">
									{entry.label}
								</span>
								{entry.addedBy ? (
									<Link
										href={`/users/${entry.addedBy.username}` as Route}
										className="text-muted-foreground underline-offset-4 hover:underline"
									>
										{entry.addedBy.name}
									</Link>
								) : null}
								<span
									className="text-muted-foreground text-xs"
									title={formatDateTime(entry.createdAt)}
								>
									<RelativeTime date={entry.createdAt} className="text-xs" />
								</span>
							</li>
						))}
					</ul>
				</Panel>
			) : null}

			<Panel title="Who voted">
				{data.voters == null ? (
					<p className="flex items-start gap-2 text-muted-foreground text-sm leading-relaxed">
						<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
						<span>
							This poll uses the “{ballotLabel.label}” privacy layer.{" "}
							{ballotLabel.hint} That stays private even from you.
						</span>
					</p>
				) : data.voters.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nobody has voted yet.</p>
				) : (
					<ul className="divide-y divide-border">
						{data.voters.map((voter) => (
							<li
								key={voter.username}
								className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
							>
								<div className="flex items-center gap-3">
									<UserAvatar user={voter} className="size-8" />
									<span className="min-w-0 flex-1">
										<Link
											href={`/users/${voter.username}` as Route}
											className="block truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{voter.name}
										</Link>
										<span className="block truncate text-muted-foreground text-xs">
											voted{" "}
											<span title={formatDateTime(voter.votedAt)}>
												<RelativeTime
													date={voter.votedAt}
													className="text-xs"
												/>
											</span>
											{voter.changedAt ? " · changed their vote" : ""}
										</span>
									</span>
								</div>
								{voter.choices ? (
									<ol className="flex flex-wrap gap-1.5 ps-11">
										{voter.choices.map((optionId, index) => (
											<li
												key={optionId}
												className="border border-border px-2 py-0.5 text-xs"
											>
												{ranking ? `${index + 1}. ` : ""}
												{labels.get(optionId)?.label ?? "Removed option"}
											</li>
										))}
									</ol>
								) : null}
							</li>
						))}
					</ul>
				)}
			</Panel>

			<DestructiveConfirmDialog
				open={closing}
				onOpenChange={setClosing}
				title="Close this poll now?"
				description="Nobody can vote after this, and everyone who voted gets a notification. This cannot be undone."
				confirmLabel="Close poll"
				loading={closeMutation.isPending}
				onConfirm={() => closeMutation.mutate({ postSlug })}
			/>
			<PollVotersDialog
				open={votersFor != null}
				onOpenChange={(next) => !next && setVotersForId(null)}
				title={votersFor?.label ?? ""}
				voters={votersForId ? votersOf(votersForId) : []}
			/>
		</div>
	);
}

export type { PollStatsData };
