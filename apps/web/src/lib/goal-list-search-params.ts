import type { ListGoalsByUsernameOutput } from "@bbrc/api/modules/goal/goal.schema";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import type { FieldLabels } from "@/lib/listing/labels";
import { createSortByParser, sortDirectionParser } from "@/lib/listing/parsers";

export const goalSortableFields = [
	"year",
	"percentage",
	"target",
	"current",
] as const;

export type GoalSortableField = (typeof goalSortableFields)[number];

export const goalSortByLabels = {
	year: "Year",
	percentage: "Progress",
	target: "Target",
	current: "Current count",
} as const satisfies FieldLabels<GoalSortableField>;

export const goalCompletionFilters = [
	"all",
	"completed",
	"non-completed",
] as const;

export type GoalCompletionFilter = (typeof goalCompletionFilters)[number];

export const goalScopeFilterKinds = ["none", "authors", "countries"] as const;

export type GoalScopeFilterKind = (typeof goalScopeFilterKinds)[number];

const defaultGoalScopes = [...goalScopeFilterKinds];

export const goalCompletionFilterLabels = {
	all: "All",
	completed: "Completed",
	"non-completed": "Non-completed",
} as const satisfies Record<GoalCompletionFilter, string>;

export const goalScopeFilterLabels = {
	none: "All books",
	authors: "Authors",
	countries: "Countries",
} as const satisfies Record<GoalScopeFilterKind, string>;

export const goalListSearchParams = {
	completion: parseAsStringLiteral(goalCompletionFilters)
		.withDefault("all")
		.withOptions({ shallow: false }),
	years: parseAsArrayOf(parseAsInteger).withOptions({ shallow: false }),
	scopes: parseAsArrayOf(parseAsStringLiteral(goalScopeFilterKinds))
		.withDefault(defaultGoalScopes)
		.withOptions({ shallow: false }),
	sortBy: createSortByParser(goalSortableFields)
		.withDefault("year")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser
		.withDefault("desc")
		.withOptions({ shallow: false }),
};

export function useGoalListSearchParams() {
	return useQueryStates(goalListSearchParams, { shallow: false });
}

export type GoalListSearchParams = ReturnType<
	typeof useGoalListSearchParams
>[0];

function scopesAreDefault(scopes: GoalScopeFilterKind[] | null): boolean {
	if (!scopes || scopes.length === 0) {
		return true;
	}
	if (scopes.length !== goalScopeFilterKinds.length) {
		return false;
	}
	return goalScopeFilterKinds.every((kind) => scopes.includes(kind));
}

export function countGoalListFilters(params: GoalListSearchParams): number {
	let count = 0;
	if (params.completion !== "all") {
		count += 1;
	}
	if ((params.years?.length ?? 0) > 0) {
		count += 1;
	}
	if (!scopesAreDefault(params.scopes)) {
		count += 1;
	}
	return count;
}

export function clearGoalListFilters(
	setParams: ReturnType<typeof useGoalListSearchParams>[1],
) {
	void setParams({
		completion: null,
		years: null,
		scopes: null,
	});
}

export function collectGoalYears(
	items: ListGoalsByUsernameOutput["items"],
): number[] {
	return [...new Set(items.map((item) => item.year))].toSorted((a, b) => b - a);
}

export function filterGoalListItems(
	items: ListGoalsByUsernameOutput["items"],
	params: GoalListSearchParams,
): ListGoalsByUsernameOutput["items"] {
	let filtered = items;

	if (params.completion === "completed") {
		filtered = filtered.filter((item) => item.isComplete);
	} else if (params.completion === "non-completed") {
		filtered = filtered.filter((item) => !item.isComplete);
	}

	const selectedYears = params.years ?? [];
	if (selectedYears.length > 0) {
		const yearSet = new Set(selectedYears);
		filtered = filtered.filter((item) => yearSet.has(item.year));
	}

	const selectedScopes = params.scopes ?? defaultGoalScopes;
	if (!scopesAreDefault(selectedScopes)) {
		const scopeSet = new Set(selectedScopes);
		filtered = filtered.filter((item) => scopeSet.has(item.scope.kind));
	}

	return filtered;
}

type GoalListItem = ListGoalsByUsernameOutput["items"][number];

function goalProgressRatio(item: GoalListItem): number {
	if (item.target <= 0) {
		return 0;
	}
	return item.current / item.target;
}

function compareGoalsBySort(
	a: GoalListItem,
	b: GoalListItem,
	sortBy: GoalSortableField,
	sortDirection: "asc" | "desc",
): number {
	const directionMultiplier = sortDirection === "asc" ? 1 : -1;

	let primary = 0;
	switch (sortBy) {
		case "year":
			primary = a.year - b.year;
			break;
		case "target":
			primary = a.target - b.target;
			break;
		case "current":
			primary = a.current - b.current;
			break;
		case "percentage":
			primary = goalProgressRatio(a) - goalProgressRatio(b);
			break;
		default:
			break;
	}

	if (primary !== 0) {
		return primary * directionMultiplier;
	}

	return b.createdAt.getTime() - a.createdAt.getTime();
}

export function sortGoalListItems(
	items: ListGoalsByUsernameOutput["items"],
	params: GoalListSearchParams,
): ListGoalsByUsernameOutput["items"] {
	const sortBy = (params.sortBy ?? "year") as GoalSortableField;
	const sortDirection = (params.sortDirection ?? "desc") as "asc" | "desc";

	return items.toSorted((a, b) =>
		compareGoalsBySort(a, b, sortBy, sortDirection),
	);
}

export function partitionFilteredGoals(
	items: ListGoalsByUsernameOutput["items"],
): Pick<ListGoalsByUsernameOutput, "active" | "expired"> {
	const active: ListGoalsByUsernameOutput["active"] = [];
	const expired: ListGoalsByUsernameOutput["expired"] = [];

	for (const item of items) {
		if (item.isExpired) {
			expired.push(item);
		} else {
			active.push(item);
		}
	}

	return { active, expired };
}
