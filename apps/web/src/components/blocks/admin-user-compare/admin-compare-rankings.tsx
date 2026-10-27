"use client";

import type { CompareStatsOutput } from "@bbrc/api/modules/user-compare-admin/user-compare-admin.schema";
import { describeScoreBand } from "@bbrc/shared";
import type { Route } from "next";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { adminComparePairHref } from "@/lib/listing/admin-user-compare-listing";
import { cn } from "@/lib/utils";

type Pair = CompareStatsOutput["topPairs"][number];
type Member = CompareStatsOutput["mostSimilarMembers"][number];

/** A bar that fills to the score. Width is the only thing that encodes the number. */
function ScoreBar({ score, tone }: { score: number; tone: "high" | "low" }) {
	return (
		<div
			className="h-1.5 w-full bg-muted"
			role="img"
			aria-label={`Score ${score} out of 100`}
		>
			<div
				className={cn("h-full", tone === "high" ? "bg-chart-1" : "bg-chart-4")}
				style={{ width: `${Math.max(2, score)}%` }}
			/>
		</div>
	);
}

function PairAvatars({ pair }: { pair: Pair }) {
	return (
		<span className="flex shrink-0 -space-x-2" aria-hidden>
			<UserAvatar user={pair.a} className="size-8 ring-2 ring-card" />
			<UserAvatar user={pair.b} className="size-8 ring-2 ring-card" />
		</span>
	);
}

/** The ten highest or lowest pair scores. Each row opens that pair in the admin compare. */
export function PairRankList({
	title,
	description,
	pairs,
	tone,
	emptyText,
}: {
	title: string;
	description: string;
	pairs: Pair[];
	tone: "high" | "low";
	emptyText: string;
}) {
	return (
		<section
			aria-label={title}
			className="flex min-w-0 flex-col gap-3 border border-border bg-card p-4"
		>
			<header>
				<h3 className="font-medium text-sm">{title}</h3>
				<p className="text-muted-foreground text-xs">{description}</p>
			</header>
			{pairs.length === 0 ? (
				<p className="py-6 text-center text-muted-foreground text-sm">
					{emptyText}
				</p>
			) : (
				<ol className="flex flex-col divide-y divide-border">
					{pairs.map((pair, index) => (
						<li key={`${pair.a.username}:${pair.b.username}`}>
							<Link
								href={
									adminComparePairHref(
										pair.a.username,
										pair.b.username,
									) as Route
								}
								className="-mx-2 flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
							>
								<span className="w-5 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
									{index + 1}
								</span>
								<PairAvatars pair={pair} />
								<span className="flex min-w-0 flex-1 flex-col gap-1.5">
									<span className="truncate text-sm">
										<span className="font-medium">{pair.a.name}</span>
										<span className="text-muted-foreground"> and </span>
										<span className="font-medium">{pair.b.name}</span>
									</span>
									<ScoreBar score={pair.score} tone={tone} />
									<span className="truncate text-muted-foreground text-xs">
										{describeScoreBand(pair.score).label}
										{" · "}
										{pair.sharedCount}{" "}
										{pair.sharedCount === 1 ? "shared book" : "shared books"}
										{pair.coRatedCount > 0
											? `, ${pair.coRatedCount} rated by both`
											: ""}
									</span>
								</span>
								<span className="w-10 shrink-0 text-right font-medium text-lg tabular-nums">
									{pair.score}
								</span>
							</Link>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}

/** Five members, each with the number that put them on the list and their closest peer. */
export function MemberRankCards({
	title,
	description,
	members,
	metric,
	emptyText,
}: {
	title: string;
	description: string;
	members: Member[];
	/** Which number leads: the mean of their best pairs, or the mean of all their pairs. */
	metric: "similarity" | "meanScore";
	emptyText: string;
}) {
	return (
		<section aria-label={title} className="flex min-w-0 flex-col gap-3">
			<header>
				<h3 className="font-medium text-sm">{title}</h3>
				<p className="text-muted-foreground text-xs">{description}</p>
			</header>
			{members.length === 0 ? (
				<p className="border border-border bg-card py-6 text-center text-muted-foreground text-sm">
					{emptyText}
				</p>
			) : (
				<ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
					{members.map((member, index) => (
						<li
							key={member.user.username}
							className="flex items-center gap-3 border border-border bg-card p-3"
						>
							<span className="w-4 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
								{index + 1}
							</span>
							<UserAvatar user={member.user} className="size-10" />
							<div className="flex min-w-0 flex-1 flex-col">
								<Link
									href={`/users/${member.user.username}` as Route}
									className="truncate font-medium text-sm hover:underline"
								>
									{member.user.name}
								</Link>
								<span className="truncate text-muted-foreground text-xs">
									{member.booksRead} {member.booksRead === 1 ? "read" : "reads"}
									{" · compared with "}
									{member.peers}
								</span>
								{member.closest ? (
									<Link
										href={
											adminComparePairHref(
												member.user.username,
												member.closest.user.username,
											) as Route
										}
										className="truncate text-xs underline-offset-4 hover:underline"
									>
										Closest: {member.closest.user.name} ({member.closest.score})
									</Link>
								) : null}
							</div>
							<div className="shrink-0 text-right">
								<p className="font-medium text-xl tabular-nums">
									{member[metric].toFixed(1)}
								</p>
								<p className="text-2xs text-muted-foreground">
									{metric === "similarity" ? "top 5 mean" : "all pairs mean"}
								</p>
							</div>
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
