"use client";

import {
	ACTIVITY_FORMAT_LABELS,
	ACTIVITY_MODE_LABELS,
	ACTIVITY_MODES,
	type ActivityFormat,
	type ActivityMode,
	type ActivityScope,
	DATE_PRESET_LABELS,
	DATE_PRESETS,
	DAY_PART_LABELS,
	DAY_PARTS,
	type DatePreset,
	type DayPart,
	WEEKDAY_LABELS,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Calendar } from "@bbrc/ui/components/calendar";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { CalendarDays, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingToggleChip } from "@/components/listing/listing-toggle-chip";
import type { FilterGroup, useActivityState } from "./use-activity-state";

type Api = ReturnType<typeof useActivityState>;

export type ActivityFacets = {
	books: { slug: string; name: string }[];
	authors: { slug: string; name: string }[];
	formats: ActivityFormat[];
	maxMinutes: number;
	maxPages: number;
	maxSpeed: number;
	firstDay: string | null;
};

/* ----- dates ----- */

function parseDay(key: string | null): Date | undefined {
	if (!key) return undefined;
	const [y, m, d] = key.split("-").map(Number);
	return y && m && d ? new Date(y, m - 1, d) : undefined;
}

function dayKey(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortDay(key: string): string {
	const date = parseDay(key);
	return date
		? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
		: key;
}

/** The date range for every part of the page: a preset or two custom days. */
export function ActivityDateControl({ api }: { api: Api }) {
	const { state } = api;
	const [open, setOpen] = useState(false);
	const selected = {
		from: parseDay(state.from),
		to: parseDay(state.to),
	};
	const customLabel =
		state.from && state.to
			? state.from === state.to
				? shortDay(state.from)
				: `${shortDay(state.from)} to ${shortDay(state.to)}`
			: state.from
				? `From ${shortDay(state.from)}`
				: state.to
					? `Until ${shortDay(state.to)}`
					: "Custom";

	return (
		<div className="flex flex-wrap items-center gap-2">
			<SegmentedControl<DatePreset>
				label="Date range"
				// Nothing is selected while custom days are in force.
				value={(api.dated ? "custom" : state.range) as DatePreset}
				onChange={api.setRange}
				options={DATE_PRESETS.map((id) => ({
					id,
					label: DATE_PRESET_LABELS[id],
				}))}
			/>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							type="button"
							variant={api.dated ? "default" : "outline"}
							size="sm"
						/>
					}
				>
					<CalendarDays data-icon="inline-start" aria-hidden />
					{customLabel}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						mode="range"
						numberOfMonths={1}
						weekStartsOn={1}
						selected={selected}
						defaultMonth={selected.from ?? new Date()}
						disabled={{ after: new Date() }}
						onSelect={(range) => {
							api.setCustomRange(
								range?.from ? dayKey(range.from) : null,
								range?.to
									? dayKey(range.to)
									: range?.from
										? dayKey(range.from)
										: null,
							);
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}

/* ----- the filters sheet ----- */

function toggled<T>(list: T[] | null, value: T, on: boolean): T[] | null {
	const current = list ?? [];
	const next = on
		? [...new Set([...current, value])]
		: current.filter((item) => item !== value);
	return next.length > 0 ? next : null;
}

/** Pick some of a member's own books or authors, with a search. */
function FacetPicker({
	legend,
	options,
	selected,
	onChange,
}: {
	legend: string;
	options: { slug: string; name: string }[];
	selected: string[];
	onChange: (next: string[] | null) => void;
}) {
	const [search, setSearch] = useState("");
	const shown = useMemo(() => {
		const q = search.trim().toLowerCase();
		return q
			? options.filter((o) => o.name.toLowerCase().includes(q))
			: options;
	}, [options, search]);

	return (
		<FieldSet>
			<FieldLegend>{legend}</FieldLegend>
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={`Search ${legend.toLowerCase()}`}
					aria-label={`Search ${legend.toLowerCase()}`}
					className="pl-9"
				/>
			</div>
			<ScrollArea className="h-44 border border-border">
				{shown.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">Nothing matches.</p>
				) : (
					<ul className="divide-y divide-border">
						{shown.map((option) => (
							<li key={option.slug}>
								<FieldLabel className="cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
									<Checkbox
										checked={selected.includes(option.slug)}
										onCheckedChange={(checked) =>
											onChange(toggled(selected, option.slug, checked === true))
										}
									/>
									<FieldTitle className="line-clamp-2 font-normal text-sm">
										{option.name}
									</FieldTitle>
								</FieldLabel>
							</li>
						))}
					</ul>
				)}
			</ScrollArea>
		</FieldSet>
	);
}

export function ActivityFiltersSheet({
	api,
	facets,
	scope,
}: {
	api: Api;
	facets: ActivityFacets;
	scope: ActivityScope;
}) {
	const { state, setState } = api;

	return (
		<ListingFiltersSheet
			title="Reading filters"
			description="They apply to the sessions, the stats and the rankings."
			activeFilterCount={api.activeFilterCount}
			onClear={api.clearFilters}
		>
			<FacetPicker
				legend="Books"
				options={facets.books}
				selected={state.books ?? []}
				onChange={(books) => void setState({ books })}
			/>
			<FacetPicker
				legend="Authors"
				options={facets.authors}
				selected={state.authors ?? []}
				onChange={(authors) => void setState({ authors })}
			/>
			<ListingCheckboxList
				legend="Method"
				options={ACTIVITY_MODES.map((mode) => ({
					id: mode,
					label: ACTIVITY_MODE_LABELS[mode],
					checked: state.modes?.includes(mode) ?? false,
					onCheckedChange: (on) =>
						void setState({ modes: toggled(state.modes, mode, on) }),
				}))}
			/>
			<ListingIntegerRangeFields
				legend="Length in minutes"
				minId="activity-min-minutes"
				maxId="activity-max-minutes"
				inputMin={0}
				min={state.minMin}
				max={state.maxMin}
				onMinChange={(minMin) => void setState({ minMin })}
				onMaxChange={(maxMin) => void setState({ maxMin })}
				placeholderMax={facets.maxMinutes ? String(facets.maxMinutes) : "Max"}
			/>
			{scope.progress ? (
				<>
					<ListingIntegerRangeFields
						legend="Pages gained"
						minId="activity-min-pages"
						maxId="activity-max-pages"
						inputMin={0}
						min={state.minPages}
						max={state.maxPages}
						onMinChange={(minPages) => void setState({ minPages })}
						onMaxChange={(maxPages) => void setState({ maxPages })}
						placeholderMax={facets.maxPages ? String(facets.maxPages) : "Max"}
					/>
					<ListingIntegerRangeFields
						legend="Percent gained"
						minId="activity-min-pct"
						maxId="activity-max-pct"
						inputMin={0}
						min={state.minPct}
						max={state.maxPct}
						onMinChange={(minPct) => void setState({ minPct })}
						onMaxChange={(maxPct) => void setState({ maxPct })}
						placeholderMax="100"
					/>
					<ListingIntegerRangeFields
						legend="Reading speed in pages per hour"
						minId="activity-min-speed"
						maxId="activity-max-speed"
						inputMin={0}
						min={state.minSpeed}
						max={state.maxSpeed}
						onMinChange={(minSpeed) => void setState({ minSpeed })}
						onMaxChange={(maxSpeed) => void setState({ maxSpeed })}
						placeholderMax={facets.maxSpeed ? String(facets.maxSpeed) : "Max"}
					/>
				</>
			) : null}
			{facets.formats.length > 1 ? (
				<ListingCheckboxList
					legend="Edition"
					options={facets.formats.map((format) => ({
						id: format,
						label: ACTIVITY_FORMAT_LABELS[format],
						checked: state.formats?.includes(format) ?? false,
						onCheckedChange: (on) =>
							void setState({ formats: toggled(state.formats, format, on) }),
					}))}
				/>
			) : null}
			<ListingCheckboxList
				legend="Weekday"
				options={WEEKDAY_LABELS.map((label, index) => ({
					id: String(index),
					label,
					checked: state.days?.includes(index) ?? false,
					onCheckedChange: (on) =>
						void setState({ days: toggled(state.days, index, on) }),
				}))}
			/>
			{scope.clock ? (
				<ListingCheckboxList
					legend="Time of day"
					options={DAY_PARTS.map((part) => ({
						id: part,
						label: DAY_PART_LABELS[part],
						checked: state.parts?.includes(part) ?? false,
						onCheckedChange: (on) =>
							void setState({ parts: toggled(state.parts, part, on) }),
					}))}
				/>
			) : null}
			<div className="flex flex-wrap gap-2">
				{scope.finish ? (
					<ListingToggleChip
						pressed={state.finished === true}
						onPressedChange={(on) =>
							void setState({ finished: on ? true : null })
						}
					>
						Finished the book
					</ListingToggleChip>
				) : null}
				<ListingToggleChip
					pressed={state.target === true}
					onPressedChange={(on) => void setState({ target: on ? true : null })}
				>
					Countdowns that hit the target
				</ListingToggleChip>
			</div>
		</ListingFiltersSheet>
	);
}

/* ----- what is in force ----- */

function span(
	min: number | null,
	max: number | null,
	unit: string,
): string | null {
	if (min != null && max != null) return `${min} to ${max} ${unit}`;
	if (min != null) return `At least ${min} ${unit}`;
	if (max != null) return `At most ${max} ${unit}`;
	return null;
}

function names(
	slugs: string[] | null,
	options: { slug: string; name: string }[],
	noun: string,
): string | null {
	if (!slugs?.length) return null;
	if (slugs.length === 1) {
		return options.find((o) => o.slug === slugs[0])?.name ?? `1 ${noun}`;
	}
	return `${slugs.length} ${noun}s`;
}

/** One short phrase per filter in force, each removable. */
export function ActiveFilterBadges({
	api,
	facets,
}: {
	api: Api;
	facets: ActivityFacets | null;
}) {
	const { state } = api;
	const labels: Record<FilterGroup, string | null> = {
		books: names(state.books, facets?.books ?? [], "book"),
		authors: names(state.authors, facets?.authors ?? [], "author"),
		modes: state.modes?.length
			? state.modes.map((m: ActivityMode) => ACTIVITY_MODE_LABELS[m]).join(", ")
			: null,
		formats: state.formats?.length
			? state.formats
					.map((f: ActivityFormat) => ACTIVITY_FORMAT_LABELS[f])
					.join(", ")
			: null,
		minutes: span(state.minMin, state.maxMin, "min"),
		pages: span(state.minPages, state.maxPages, "pages gained"),
		percent: span(state.minPct, state.maxPct, "% gained"),
		speed: span(state.minSpeed, state.maxSpeed, "pages per hour"),
		finished: state.finished ? "Finished the book" : null,
		target: state.target ? "Hit the target" : null,
		parts: state.parts?.length
			? state.parts.map((p: DayPart) => DAY_PART_LABELS[p]).join(", ")
			: null,
		days: state.days?.length
			? state.days.map((d: number) => WEEKDAY_LABELS[d]?.slice(0, 3)).join(", ")
			: null,
	};
	if (api.activeGroups.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{api.activeGroups.map((group) => (
				<Badge key={group} variant="secondary" className="gap-1 pr-1">
					{labels[group]}
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="size-4"
						aria-label={`Remove filter: ${labels[group]}`}
						onClick={() => api.clearGroup(group)}
					>
						<X aria-hidden />
					</Button>
				</Badge>
			))}
			<Button
				type="button"
				variant="link"
				size="sm"
				className="h-auto px-1 text-muted-foreground"
				onClick={api.clearFilters}
			>
				Clear filters
			</Button>
		</div>
	);
}
