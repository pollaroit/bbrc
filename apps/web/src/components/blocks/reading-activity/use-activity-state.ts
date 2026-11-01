"use client";

import {
	ACTIVITY_FORMATS,
	ACTIVITY_MODES,
	ACTIVITY_SORT_FIELDS,
	type ActivityFormat,
	type ActivityMode,
	DATE_PRESETS,
	DAY_PARTS,
	type DatePreset,
	type DayPart,
} from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";

export const RANK_TABS = [
	"books",
	"days",
	"weeks",
	"months",
	"weekdays",
	"parts",
] as const;
export type RankTab = (typeof RANK_TABS)[number];

export const ACTIVITY_VIEWS = ["sessions", "stats"] as const;
export type ActivityView = (typeof ACTIVITY_VIEWS)[number];

/**
 * Everything on the reading page lives in the address, so a reload, the back
 * button and a shared link keep the view, the filters, the sort and the open
 * session. The filters are global: they cut the grid, the stats and the
 * rankings alike.
 */
const parsers = {
	view: parseAsStringLiteral(ACTIVITY_VIEWS).withDefault("sessions"),
	range: parseAsStringLiteral(DATE_PRESETS).withDefault("all"),
	from: parseAsString,
	to: parseAsString,
	books: parseAsArrayOf(parseAsString),
	authors: parseAsArrayOf(parseAsString),
	modes: parseAsArrayOf(parseAsStringLiteral(ACTIVITY_MODES)),
	formats: parseAsArrayOf(parseAsStringLiteral(ACTIVITY_FORMATS)),
	minMin: parseAsFloat,
	maxMin: parseAsFloat,
	minPages: parseAsInteger,
	maxPages: parseAsInteger,
	minPct: parseAsInteger,
	maxPct: parseAsInteger,
	minSpeed: parseAsFloat,
	maxSpeed: parseAsFloat,
	finished: parseAsBoolean,
	target: parseAsBoolean,
	parts: parseAsArrayOf(parseAsStringLiteral(DAY_PARTS)),
	days: parseAsArrayOf(parseAsInteger),
	sortBy: parseAsStringLiteral(ACTIVITY_SORT_FIELDS).withDefault("date"),
	sortDirection: parseAsStringLiteral(["asc", "desc"] as const).withDefault(
		"desc",
	),
	session: parseAsString,
	rank: parseAsStringLiteral(RANK_TABS).withDefault("books"),
	heat: parseAsStringLiteral(["time", "sessions"] as const).withDefault("time"),
};

/**
 * The filters, in groups: a minimum and a maximum of the same measure are one
 * filter. This is what the badge counts and what a removable chip clears.
 */
export const FILTER_GROUPS = {
	books: ["books"],
	authors: ["authors"],
	modes: ["modes"],
	formats: ["formats"],
	minutes: ["minMin", "maxMin"],
	pages: ["minPages", "maxPages"],
	percent: ["minPct", "maxPct"],
	speed: ["minSpeed", "maxSpeed"],
	finished: ["finished"],
	target: ["target"],
	parts: ["parts"],
	days: ["days"],
} as const satisfies Record<string, readonly (keyof typeof parsers)[]>;

export type FilterGroup = keyof typeof FILTER_GROUPS;

function filled(value: unknown): boolean {
	return Array.isArray(value) ? value.length > 0 : value != null;
}

export function useActivityState() {
	const [state, setState] = useQueryStates(parsers, {
		history: "replace",
		clearOnDefault: true,
	});

	const activeGroups = (Object.keys(FILTER_GROUPS) as FilterGroup[]).filter(
		(group) => FILTER_GROUPS[group].some((key) => filled(state[key])),
	);

	const clear = (groups: readonly FilterGroup[]) =>
		void setState(
			Object.fromEntries(
				groups.flatMap((group) =>
					FILTER_GROUPS[group].map((key) => [key, null] as const),
				),
			),
		);

	return {
		state,
		setState,
		activeGroups,
		activeFilterCount: activeGroups.length,
		/** Whether a custom day range (rather than a preset) is in force. */
		dated: state.from != null || state.to != null,
		clearGroup: (group: FilterGroup) => clear([group]),
		clearFilters: () => clear(Object.keys(FILTER_GROUPS) as FilterGroup[]),
		setRange: (range: DatePreset) =>
			void setState({ range, from: null, to: null }),
		setCustomRange: (from: string | null, to: string | null) =>
			void setState({ from, to, range: "all" }),
	};
}

export type ActivityStateApi = ReturnType<typeof useActivityState>;

export type ActivityState = ActivityStateApi["state"];

/** What the API takes: the preset only travels when no custom days are set. */
export function toActivityInput(state: ActivityState) {
	const custom = state.from != null || state.to != null;
	return {
		range: custom ? undefined : state.range,
		from: state.from ?? undefined,
		to: state.to ?? undefined,
		books: state.books ?? undefined,
		authors: state.authors ?? undefined,
		modes: (state.modes ?? undefined) as ActivityMode[] | undefined,
		formats: (state.formats ?? undefined) as ActivityFormat[] | undefined,
		minMinutes: state.minMin ?? undefined,
		maxMinutes: state.maxMin ?? undefined,
		minPages: state.minPages ?? undefined,
		maxPages: state.maxPages ?? undefined,
		minPercent: state.minPct ?? undefined,
		maxPercent: state.maxPct ?? undefined,
		minSpeed: state.minSpeed ?? undefined,
		maxSpeed: state.maxSpeed ?? undefined,
		finished: state.finished ?? undefined,
		targetMet: state.target ?? undefined,
		dayParts: (state.parts ?? undefined) as DayPart[] | undefined,
		weekdays: state.days ?? undefined,
	};
}
