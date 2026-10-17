"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useCreateGoal } from "@/components/blocks/create-goal-provider";
import { GoalCard } from "@/components/blocks/goal-card";
import { UserGoalsListToolbar } from "@/components/blocks/user-goals-list-toolbar";
import {
	collectGoalYears,
	filterGoalListItems,
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
			<div className="grid gap-4 sm:grid-cols-2">
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

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
					{showOwnerChrome
						? "Track how many books you finish each year. Scoped goals only count reads that match your filters."
						: "Yearly reading targets for this member."}
				</p>
				{showOwnerChrome ? (
					<Button size="sm" onClick={openCreateGoal}>
						New goal
					</Button>
				) : null}
			</div>

			{hasGoals ? <UserGoalsListToolbar yearOptions={yearOptions} /> : null}

			{!hasGoals ? (
				<div className="border border-border border-dashed px-6 py-12 text-center">
					<p className="font-medium">No goals yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{showOwnerChrome
							? "Create a goal to set a target for this year or next."
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
						Try a different status, year, or scope.
					</p>
				</div>
			) : (
				<>
					{active.length > 0 ? (
						<section className="space-y-4">
							<h2 className="font-semibold text-lg">Active</h2>
							<ul className="grid gap-4 sm:grid-cols-2">
								{active.map((goal) => (
									<li key={goal.id}>
										<GoalCard username={username} goal={goal} />
									</li>
								))}
							</ul>
						</section>
					) : null}

					{expired.length > 0 ? (
						<section className="space-y-4">
							<h2 className="font-semibold text-lg text-muted-foreground">
								Expired
							</h2>
							<ul className="grid gap-4 sm:grid-cols-2">
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
