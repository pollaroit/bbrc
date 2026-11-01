"use client";

import type { ActivityOverviewOutput } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import { formatActivityDuration } from "@bbrc/shared";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Clock, Flame, Library, Lock, Rows3, Timer } from "lucide-react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { orpc } from "@/utils/orpc";
import {
	ActiveFilterBadges,
	ActivityDateControl,
	ActivityFiltersSheet,
} from "./activity-filters";
import { ActivityHero } from "./activity-hero";
import { ActivitySessions } from "./activity-sessions";
import { ActivityStats } from "./activity-stats";
import { plural } from "./format";
import { StatCard } from "./stat-card";
import {
	ACTIVITY_VIEWS,
	type ActivityView,
	toActivityInput,
	useActivityState,
} from "./use-activity-state";

const VIEW_LABELS: Record<ActivityView, string> = {
	sessions: "Sessions",
	stats: "Stats",
};

type Numbers = Extract<
	ActivityOverviewOutput,
	{ access: "numbers" }
>["numbers"];

function Notice({ children }: { children: React.ReactNode }) {
	return (
		<Card size="sm">
			<CardContent className="flex items-start gap-3">
				<Lock
					className="mt-0.5 size-4 shrink-0 text-muted-foreground"
					aria-hidden
				/>
				<p className="text-sm">{children}</p>
			</CardContent>
		</Card>
	);
}

/** A closed section on a public profile: five totals, no names, no dates, no filters. */
function ClosedNumbers({ numbers, name }: { numbers: Numbers; name: string }) {
	return (
		<div className="flex flex-col gap-4">
			<Notice>
				{name} keeps their reading sessions private. These totals include all of
				their reading, but not which books or when.
			</Notice>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				<StatCard
					featured
					icon={Clock}
					label="Time read"
					value={formatActivityDuration(numbers.seconds)}
					className="sm:col-span-2"
				/>
				<StatCard
					icon={Rows3}
					label="Sessions"
					value={String(numbers.sessions)}
				/>
				<StatCard
					icon={Library}
					label="Different books"
					value={String(numbers.books)}
				/>
				<StatCard
					icon={Timer}
					label="Average session"
					value={formatActivityDuration(numbers.averageSeconds)}
				/>
				<StatCard
					icon={Flame}
					label="Current streak"
					value={plural(numbers.currentStreak, "day")}
				/>
			</div>
		</div>
	);
}

/**
 * `/users/[username]/reading`: a member's Reading Mode sessions and what they
 * add up to. What the viewer gets (everything, a few totals, or nothing) is
 * decided on the server; this only draws it.
 */
export function ReadingActivityPage({
	username,
	name,
}: {
	username: string;
	name: string;
}) {
	const api = useActivityState();
	const { state, setState } = api;
	const query = useQuery({
		...orpc.readingActivity.overview.queryOptions({
			input: { ...toActivityInput(state), username },
		}),
		placeholderData: keepPreviousData,
	});

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-5">
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-24 w-full" />
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }, (_, index) => (
						<Skeleton key={index} className="h-52 w-full" />
					))}
				</div>
			</div>
		);
	}
	if (query.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				Could not load reading activity: {query.error.message}
			</p>
		);
	}

	const data = query.data;
	if (data.access === "closed") {
		return (
			<Notice>
				{name} has a private profile. Only their friends can see their reading.
			</Notice>
		);
	}
	if (data.access === "numbers") {
		return <ClosedNumbers numbers={data.numbers} name={name} />;
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="font-heading font-semibold text-2xl tracking-tight">
						Reading
					</h2>
					<p className="text-muted-foreground text-sm">
						{data.isOwner
							? "Every Reading Mode session you finished, and what they add up to."
							: `${name}'s Reading Mode sessions, and what they add up to.`}
					</p>
				</div>
				<SegmentedControl<ActivityView>
					label="Sessions or stats"
					value={state.view}
					onChange={(view) => void setState({ view })}
					options={ACTIVITY_VIEWS.map((id) => ({
						id,
						label: VIEW_LABELS[id],
					}))}
				/>
			</div>

			<ActivityHero overview={data} subject={data.isOwner ? "You" : name} />

			<Card size="sm">
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<ActivityDateControl api={api} />
						<ActivityFiltersSheet
							api={api}
							facets={data.facets}
							scope={data.scope}
						/>
					</div>
					<ActiveFilterBadges api={api} facets={data.facets} />
				</CardContent>
			</Card>

			{state.view === "sessions" ? (
				<ActivitySessions username={username} api={api} scope={data.scope} />
			) : (
				<ActivityStats overview={data} api={api} />
			)}
		</div>
	);
}
