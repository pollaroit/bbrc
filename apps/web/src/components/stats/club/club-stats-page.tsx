"use client";

import {
	FULL_STATS_ACCESS,
	STATS_TAB_LABELS,
	type StatsTab,
	visibleStatsSections,
	visibleStatsTabs,
} from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	keepPreviousData,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import { Users } from "lucide-react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { authClient } from "@/lib/auth-client";
import { useStatsTab } from "@/lib/stats/stats-params";
import {
	userStatsQueryInput,
	useUserStatsSearchParams,
} from "@/lib/user-stats-search-params";
import { orpc } from "@/utils/orpc";
import { Scoreboard, scrollToStatsSection } from "../scoreboard";
import { StatsEmpty } from "../stats-kit";
import { StatsPeriodBar } from "../stats-period-bar";
import {
	ClubCommunityTab,
	ClubLifeStatsTab,
	ClubOverviewTab,
	ClubReadingTab,
	ClubTasteTab,
} from "./club-tabs";

const CLUB_PERIODS = ["life", "none", "year"] as const;
type ClubPeriod = (typeof CLUB_PERIODS)[number];

/** The scoreboard numbers the member also has, so "You: 31" can sit beside the club's. */
const YOU_TILES: readonly string[] = ["books", "pages", "time", "rating"];

function TabLoader<T>({
	query,
	children,
}: {
	query: UseQueryResult<T>;
	children: (data: T) => React.ReactNode;
}) {
	if (query.isPending) return <Skeleton className="h-96 w-full" aria-hidden />;
	if (query.isError || query.data === undefined) {
		return (
			<StatsEmpty>
				Could not load these stats. Try again in a moment.
			</StatsEmpty>
		);
	}
	return <>{children(query.data)}</>;
}

type ClubInput = {
	periodType: ClubPeriod;
	period?: string;
};

function ReadingLoader({ input }: { input: ClubInput }) {
	const query = useQuery({
		...orpc.clubStats.reading.queryOptions({ input }),
		placeholderData: keepPreviousData,
	});
	return (
		<TabLoader query={query}>
			{(data) => <ClubReadingTab data={data} />}
		</TabLoader>
	);
}

function TasteLoader({ input }: { input: ClubInput }) {
	const query = useQuery({
		...orpc.clubStats.taste.queryOptions({ input }),
		placeholderData: keepPreviousData,
	});
	return (
		<TabLoader query={query}>
			{(data) => <ClubTasteTab data={data} />}
		</TabLoader>
	);
}

function CommunityLoader({ input }: { input: ClubInput }) {
	const query = useQuery({
		...orpc.clubStats.community.queryOptions({ input }),
		placeholderData: keepPreviousData,
	});
	return (
		<TabLoader query={query}>
			{(data) => <ClubCommunityTab data={data} />}
		</TabLoader>
	);
}

function ClubLifeLoader({ input }: { input: ClubInput }) {
	const query = useQuery({
		...orpc.clubStats.clubLife.queryOptions({ input }),
		placeholderData: keepPreviousData,
	});
	return (
		<TabLoader query={query}>
			{(data) => <ClubLifeStatsTab data={data} />}
		</TabLoader>
	);
}

/** The club's numbers: the same tabs as a member's page, over everyone. */
export function ClubStatsPage() {
	const [params] = useUserStatsSearchParams();
	const [tab, setTab] = useStatsTab();
	const { data: session } = authClient.useSession();
	const me = session?.user.username ?? null;

	// The club has fewer periods: a month or a range from a shared link falls back to All time.
	const periodType: ClubPeriod = (CLUB_PERIODS as readonly string[]).includes(
		params.period_type,
	)
		? (params.period_type as ClubPeriod)
		: "life";
	const year = /^\d{4}$/.test(params.period?.trim() ?? "")
		? params.period?.trim()
		: undefined;
	const input: ClubInput = {
		periodType,
		...(periodType === "year" && year ? { period: year } : {}),
	};

	const overview = useQuery({
		...orpc.clubStats.overview.queryOptions({ input }),
		placeholderData: keepPreviousData,
	});

	// "You vs the club": the signed-in member's own numbers for the same period.
	const own = useQuery({
		...orpc.memberStats.overview.queryOptions({
			input: userStatsQueryInput(me ?? "", {
				period_type: periodType,
				period: periodType === "year" ? (year ?? null) : null,
				period_start: null,
				period_end: null,
			}),
		}),
		enabled: Boolean(me),
	});
	const you = own.data
		? Object.fromEntries(
				own.data.scoreboard
					.filter((tile) => YOU_TILES.includes(tile.id))
					.map((tile) => [
						tile.id,
						tile.id === "time" && tile.unit
							? `${tile.value} ${tile.unit}`
							: tile.value,
					]),
			)
		: undefined;

	if (overview.isPending) {
		return (
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4" aria-hidden>
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}
	const data = overview.data;
	if (overview.isError || !data) {
		return (
			<StatsEmpty>
				Could not load the club's stats. Try again in a moment.
			</StatsEmpty>
		);
	}

	const tabs = visibleStatsTabs(
		visibleStatsSections(FULL_STATS_ACCESS, "club"),
	);
	const active: StatsTab = tabs.includes(tab) ? tab : "overview";

	const open = (to: { tab: string; section: string }) => {
		void setTab(to.tab as StatsTab);
		scrollToStatsSection(to.section);
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24">
			<header className="border border-border bg-card">
				<div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex min-w-0 items-center gap-4">
						<span className="flex size-14 shrink-0 items-center justify-center border border-border bg-muted/40">
							<Users className="size-6 text-muted-foreground" aria-hidden />
						</span>
						<div className="flex min-w-0 flex-col gap-1">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{data.title}
							</h1>
							<p className="text-muted-foreground text-sm tabular-nums">
								{data.members} members · {data.periodLabel}
							</p>
						</div>
					</div>
					<StatsPeriodBar types={CLUB_PERIODS} firstYear={data.firstYear} />
				</div>
				<Scoreboard
					tiles={data.scoreboard}
					onOpen={open}
					you={you}
					className="border-border border-t"
				/>
			</header>

			<SegmentedControl
				label="Stats sections"
				value={active}
				options={tabs.map((id) => ({ id, label: STATS_TAB_LABELS[id] }))}
				onChange={(next) => void setTab(next)}
			/>

			<div
				className={
					overview.isPlaceholderData
						? "opacity-60 transition-opacity"
						: "transition-opacity"
				}
			>
				{active === "overview" ? <ClubOverviewTab data={data} /> : null}
				{active === "reading" ? <ReadingLoader input={input} /> : null}
				{active === "taste" ? <TasteLoader input={input} /> : null}
				{active === "community" ? <CommunityLoader input={input} /> : null}
				{active === "club-life" ? <ClubLifeLoader input={input} /> : null}
			</div>

			<p className="text-center text-muted-foreground text-xs">
				Numbers count every member and are refreshed about once an hour.
			</p>
		</div>
	);
}
