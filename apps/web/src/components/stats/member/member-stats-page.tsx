"use client";

import type { MemberStatsOverviewOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import {
	STATS_TAB_LABELS,
	type StatsTab,
	visibleStatsSections,
	visibleStatsTabs,
} from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Medal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useStatsTab } from "@/lib/stats/stats-params";
import { isUserStatsQueryReady } from "@/lib/user-stats-period-ui";
import {
	userStatsQueryInput,
	useUserStatsSearchParams,
} from "@/lib/user-stats-search-params";
import { orpc } from "@/utils/orpc";
import { Scoreboard, scrollToStatsSection } from "../scoreboard";
import { StatsEmpty } from "../stats-kit";
import { StatsPeriodBar } from "../stats-period-bar";
import { OverviewTab } from "./overview-tab";
import { ReadingTab } from "./reading-tab";

/** The tabs that exist so far; the page offers the ones a viewer may see among these. */
const IMPLEMENTED_TABS: readonly StatsTab[] = ["overview", "reading"];

function errorCode(error: unknown): string | null {
	return typeof error === "object" && error != null && "code" in error
		? String((error as { code: unknown }).code)
		: null;
}

function PageSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-hidden>
			<Skeleton className="h-64 w-full" />
			<Skeleton className="h-10 w-72" />
			<Skeleton className="h-72 w-full" />
		</div>
	);
}

function Locked({ username, name }: { username: string; name: string }) {
	return (
		<div className="flex flex-col items-center gap-3 border border-border bg-card px-6 py-14 text-center">
			<Lock className="size-6 text-muted-foreground" aria-hidden />
			<h1 className="font-semibold text-lg tracking-tight">
				{name}'s stats are private
			</h1>
			<p className="max-w-sm text-muted-foreground text-sm">
				Only friends can see them. You can still visit their profile.
			</p>
			<Link
				href={`/users/${username}` as Route}
				className="font-medium text-sm underline underline-offset-4"
			>
				Back to the profile
			</Link>
		</div>
	);
}

function Header({
	data,
	username,
}: {
	data: MemberStatsOverviewOutput;
	username: string;
}) {
	return (
		<div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex min-w-0 items-center gap-4">
				<UserAvatar
					user={{ name: data.member.name, image: data.member.image }}
					className="size-14 shrink-0"
				/>
				<div className="flex min-w-0 flex-col gap-1">
					<Link
						href={`/users/${username}` as Route}
						className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
					>
						<ArrowLeft className="size-3" aria-hidden />
						{data.member.name}
					</Link>
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{data.title}
					</h1>
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
						{data.access.reads ? (
							<span className="tabular-nums">
								{data.catalog.read} of {data.catalog.total} catalog books
								{data.catalog.percent != null
									? ` · ${data.catalog.percent}%`
									: ""}
							</span>
						) : null}
						{data.rank ? (
							<span
								className="inline-flex items-center gap-1 font-medium text-foreground tabular-nums"
								title="Among all members, by books read in this period"
							>
								<Medal className="size-4 text-warning-ink" aria-hidden />#
								{data.rank.rank} of {data.rank.of} · top {data.rank.topPercent}%
							</span>
						) : null}
					</p>
				</div>
			</div>
			<StatsPeriodBar firstYear={data.firstDatedReadYear} />
		</div>
	);
}

function ReadingTabLoader({
	input,
	ready,
}: {
	input: ReturnType<typeof userStatsQueryInput>;
	ready: boolean;
}) {
	const query = useQuery({
		...orpc.memberStats.reading.queryOptions({ input }),
		enabled: ready,
		placeholderData: keepPreviousData,
	});
	if (query.isPending) return <Skeleton className="h-96 w-full" aria-hidden />;
	if (query.isError || !query.data) {
		return (
			<StatsEmpty>
				Could not load these stats. Try again in a moment.
			</StatsEmpty>
		);
	}
	return <ReadingTab data={query.data} />;
}

export function MemberStatsPage({
	username,
	displayName,
}: {
	username: string;
	displayName: string;
}) {
	const [params] = useUserStatsSearchParams();
	const [tab, setTab] = useStatsTab();
	const ready = isUserStatsQueryReady(params);
	const input = userStatsQueryInput(username, params);

	const overview = useQuery({
		...orpc.memberStats.overview.queryOptions({ input }),
		enabled: ready,
		placeholderData: keepPreviousData,
	});

	if (overview.isPending) return <PageSkeleton />;
	if (errorCode(overview.error) === "FORBIDDEN") {
		return <Locked username={username} name={displayName} />;
	}
	const data = overview.data;
	if (overview.isError || !data) {
		return (
			<StatsEmpty>
				Could not load these stats. Try again in a moment.
			</StatsEmpty>
		);
	}

	const sections = visibleStatsSections(data.access);
	const tabs = visibleStatsTabs(sections).filter((id) =>
		IMPLEMENTED_TABS.includes(id),
	);
	const active: StatsTab = tabs.includes(tab) ? tab : (tabs[0] ?? "overview");

	const open = (to: { tab: string; section: string }) => {
		void setTab(to.tab as StatsTab);
		scrollToStatsSection(to.section);
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24">
			<header className="border border-border bg-card">
				<Header data={data} username={username} />
				<Scoreboard
					tiles={data.scoreboard}
					onOpen={open}
					className="border-border border-t"
				/>
			</header>

			{tabs.length > 1 ? (
				<SegmentedControl
					label="Stats sections"
					value={active}
					options={tabs.map((id) => ({ id, label: STATS_TAB_LABELS[id] }))}
					onChange={(next) => void setTab(next)}
				/>
			) : null}

			<div
				aria-live="polite"
				className={
					overview.isPlaceholderData
						? "opacity-60 transition-opacity"
						: "transition-opacity"
				}
			>
				{active === "overview" ? (
					<OverviewTab data={data} username={username} />
				) : null}
				{active === "reading" ? (
					<ReadingTabLoader input={input} ready={ready} />
				) : null}
			</div>

			{data.hiddenSections > 0 ? (
				<p className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
					<Lock className="size-3" aria-hidden />
					Some sections are private.
				</p>
			) : null}
		</div>
	);
}
