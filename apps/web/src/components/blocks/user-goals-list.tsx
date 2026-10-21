"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCreateGoal } from "@/components/blocks/create-goal-provider";
import { GoalCard } from "@/components/blocks/goal-card";
import { UserGoalsListToolbar } from "@/components/blocks/user-goals-list-toolbar";
import {
	collectGoalYears,
	filterGoalListItems,
	hasActiveGoalListFilters,
	partitionFilteredGoals,
	sortGoalListItems,
	useGoalListSearchParams,
} from "@/lib/goal-list-search-params";
import { orpc } from "@/utils/orpc";

type UserGoalsListProps = {
	username: string;
};

export function UserGoalsList({ username }: UserGoalsListProps) {
	const { openCreateGoal } = useCreateGoal();
	const [filterParams] = useGoalListSearchParams();

	const listQuery = useQuery(
		orpc.goal.listByUsername.queryOptions({
			input: { username },
		}),
	);

	if (listQuery.isPending) {
		return (
			<div className="grid gap-3 md:grid-cols-2" aria-hidden>
				{Array.from({ length: 2 }, (_, i) => (
					<Skeleton key={i} className="h-44 w-full" />
				))}
			</div>
		);
	}

	if (listQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{listQuery.error.message ?? "Could not load goals."}
			</p>
		);
	}

	const { isOwner, items } = listQuery.data;
	const showOwnerChrome = isOwner;
	const yearOptions = collectGoalYears(items);
	const filteredItems = sortGoalListItems(
		filterGoalListItems(items, filterParams),
		filterParams,
	);
	const { active, expired } = partitionFilteredGoals(filteredItems);
	const hasGoals = items.length > 0;
	const hasFilteredResults = filteredItems.length > 0;
	const filtered = hasActiveGoalListFilters(filterParams);

	const newGoalButton = showOwnerChrome ? (
		<Button size="sm" onClick={openCreateGoal}>
			<Plus data-icon="inline-start" aria-hidden />
			New goal
		</Button>
	) : null;

	return (
		<div className="flex flex-col gap-5">
			{hasGoals ? (
				<UserGoalsListToolbar
					yearOptions={yearOptions}
					action={newGoalButton}
				/>
			) : null}

			{hasGoals ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					{filteredItems.length} goal{filteredItems.length === 1 ? "" : "s"}
					{filtered ? " match your filters" : ""}
				</p>
			) : null}

			{!hasGoals ? (
				<div className="border border-border border-dashed px-6 py-12 text-center">
					<p className="font-medium">No goals yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{showOwnerChrome
							? "Set a target for how many books you want to finish this year. Scoped goals only count reads that match their authors or countries."
							: "This member has not published any reading goals."}
					</p>
					{showOwnerChrome ? (
						<Button className="mt-4" onClick={openCreateGoal}>
							Create your first goal
						</Button>
					) : null}
				</div>
			) : !hasFilteredResults ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">No goals match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing filters or changing your search.
					</p>
				</div>
			) : (
				<>
					{active.length > 0 ? (
						<section className="flex flex-col gap-3">
							<h2 className="font-semibold text-base tracking-tight">Active</h2>
							<ul className="grid gap-3 md:grid-cols-2">
								{active.map((goal) => (
									<li key={goal.id}>
										<GoalCard username={username} goal={goal} />
									</li>
								))}
							</ul>
						</section>
					) : null}

					{expired.length > 0 ? (
						<section className="flex flex-col gap-3">
							<h2 className="font-semibold text-base text-muted-foreground tracking-tight">
								Expired
							</h2>
							<ul className="grid gap-3 md:grid-cols-2">
								{expired.map((goal) => (
									<li key={goal.id}>
										<GoalCard username={username} goal={goal} />
									</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			)}
		</div>
	);
}
