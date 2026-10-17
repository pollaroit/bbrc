"use client";

import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	clearGoalListFilters,
	countGoalListFilters,
	type GoalCompletionFilter,
	type GoalScopeFilterKind,
	goalCompletionFilterLabels,
	goalCompletionFilters,
	goalScopeFilterKinds,
	goalScopeFilterLabels,
	goalSortableFields,
	goalSortByLabels,
	useGoalListSearchParams,
} from "@/lib/goal-list-search-params";

type UserGoalsListToolbarProps = {
	yearOptions: number[];
};

export function UserGoalsListToolbar({
	yearOptions,
}: UserGoalsListToolbarProps) {
	const [params, setParams] = useGoalListSearchParams();
	const sheetFilterCount = countGoalListFilters(params);

	const toggleYear = (year: number, checked: boolean) => {
		const current = params.years ?? [];
		const next = checked
			? [...new Set([...current, year])]
			: current.filter((value) => value !== year);

		void setParams({
			years: next.length > 0 ? next : null,
		});
	};

	const toggleScope = (scope: GoalScopeFilterKind, checked: boolean) => {
		const current = params.scopes ?? [...goalScopeFilterKinds];
		let next = checked
			? [...new Set([...current, scope])]
			: current.filter((value) => value !== scope);

		if (next.length === 0) {
			next = [...goalScopeFilterKinds];
		}

		const isDefault =
			next.length === goalScopeFilterKinds.length &&
			goalScopeFilterKinds.every((kind) => next.includes(kind));

		void setParams({
			scopes: isDefault ? null : next,
		});
	};

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<Tabs
				value={params.completion}
				onValueChange={(value) => {
					void setParams({
						completion:
							value === "all" ? null : (value as GoalCompletionFilter),
					});
				}}
			>
				<TabsList
					variant="line"
					className="h-auto w-full justify-start sm:w-auto"
				>
					{goalCompletionFilters.map((filter) => (
						<TabsTrigger key={filter} value={filter}>
							{goalCompletionFilterLabels[filter]}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="flex flex-wrap items-center gap-2 sm:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection });
					}}
					sortByOptions={goalSortableFields}
					sortByLabels={goalSortByLabels}
				/>

				<ListingFiltersSheet
					title="Goal filters"
					description="Narrow goals by calendar year or scope."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearGoalListFilters(setParams)}
				>
					{yearOptions.length > 0 ? (
						<ListingCheckboxList
							legend="Year"
							options={yearOptions.map((year) => ({
								id: String(year),
								label: String(year),
								checked: params.years?.includes(year) ?? false,
								onCheckedChange: (checked) => {
									toggleYear(year, checked);
								},
							}))}
						/>
					) : null}

					<ListingCheckboxList
						legend="Scope"
						options={goalScopeFilterKinds.map((scope) => ({
							id: scope,
							label: goalScopeFilterLabels[scope],
							checked: (params.scopes ?? goalScopeFilterKinds).includes(scope),
							onCheckedChange: (checked) => {
								toggleScope(scope, checked);
							},
						}))}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
