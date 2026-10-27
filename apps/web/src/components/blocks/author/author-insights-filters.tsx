"use client";

import type { Formatters } from "@bbrc/i18n";
import { Button } from "@bbrc/ui/components/button";
import { Calendar } from "@bbrc/ui/components/calendar";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@bbrc/ui/components/command";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { CalendarIcon, ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

/**
 * Small filter controls shared by the author "community" tabs (Sittings, Shelves, Favorites)
 * and the Stats tab. They are controlled (the page keeps the values in the address through
 * nuqs) and use only theme tokens.
 */

/** One row of filters: wraps on phones, search takes the free width. */
export function InsightsFilterRow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<search
			className={cn(
				"flex flex-wrap items-center gap-2 border border-border bg-muted/20 p-2",
				className,
			)}
		>
			{children}
		</search>
	);
}

/** Search box that waits for a pause in typing before it tells the page. */
export function InsightsSearch({
	value,
	onChange,
	placeholder,
	label,
	className,
}: {
	value: string;
	onChange: (value: string | null) => void;
	placeholder?: string;
	label: string;
	className?: string;
}) {
	const t = useTranslations("authors");
	const [draft, setDraft] = useState(value);
	const debounced = useDebouncedValue(draft, 300);
	const lastSent = useRef(value);

	useEffect(() => {
		if (debounced === lastSent.current) return;
		lastSent.current = debounced;
		onChange(debounced.trim() === "" ? null : debounced);
	}, [debounced, onChange]);

	// The address changed from outside (Clear filters, back button).
	useEffect(() => {
		if (value !== lastSent.current) {
			lastSent.current = value;
			setDraft(value);
		}
	}, [value]);

	return (
		<InputGroup className={cn("min-w-48 flex-1 bg-background", className)}>
			<InputGroupInput
				type="search"
				value={draft}
				placeholder={placeholder ?? t("insights.search")}
				aria-label={label}
				className="pl-8"
				onChange={(event) => setDraft(event.target.value)}
			/>
			<InputGroupAddon align="inline-start">
				<Search
					className="pointer-events-none size-4 text-muted-foreground"
					aria-hidden
				/>
			</InputGroupAddon>
		</InputGroup>
	);
}

export type InsightsOption = {
	value: string;
	label: string;
	/** Small text on the right (a count, a year). */
	hint?: ReactNode;
	/** Something to show before the label (a cover, an avatar). */
	lead?: ReactNode;
};

/** Pick one of a few values from a dropdown (sorts, a single kind of filter). */
export function InsightsSelect<T extends string>({
	value,
	onChange,
	options,
	label,
	prefix,
	className,
}: {
	value: T;
	onChange: (value: T) => void;
	options: readonly { value: T; label: string }[];
	label: string;
	/** Short lead text inside the trigger, e.g. "Sort". */
	prefix?: string;
	className?: string;
}) {
	const current = options.find((option) => option.value === value);

	return (
		<Select value={value} onValueChange={(next) => onChange(next as T)}>
			<SelectTrigger
				aria-label={label}
				className={cn("h-8 min-w-36 bg-background", className)}
			>
				<span className="truncate">
					{prefix ? (
						<span className="text-muted-foreground">{prefix} </span>
					) : null}
					{current?.label ?? value}
				</span>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/**
 * A dropdown with a searchable checklist. Give `options` for a fixed list (the picker filters
 * it itself) or give `onSearch` too when the options come from a search endpoint: the picker then
 * reports what was typed and skips its own filtering. Chosen values keep their labels even when
 * the options change underneath them.
 */
export function InsightsMultiPicker({
	label,
	searchPlaceholder,
	options,
	selected,
	onChange,
	onSearch,
	isLoading = false,
	emptyText,
	className,
}: {
	label: string;
	searchPlaceholder?: string;
	options: readonly InsightsOption[];
	selected: readonly string[];
	onChange: (values: string[]) => void;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
	emptyText?: string;
	className?: string;
}) {
	const t = useTranslations("authors");
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const known = useRef(new Map<string, InsightsOption>());

	for (const option of options) {
		known.current.set(option.value, option);
	}

	const chosen = new Set(selected);
	const selectedOptions = selected.map(
		(value) => known.current.get(value) ?? { value, label: value },
	);
	const rest = options.filter((option) => !chosen.has(option.value));

	function toggle(value: string) {
		onChange(
			chosen.has(value)
				? selected.filter((item) => item !== value)
				: [...selected, value],
		);
	}

	function row(option: InsightsOption) {
		return (
			<CommandItem
				key={option.value}
				value={option.value}
				keywords={[option.label]}
				onSelect={() => toggle(option.value)}
				className="gap-2"
			>
				<Checkbox
					checked={chosen.has(option.value)}
					tabIndex={-1}
					aria-hidden
					className="pointer-events-none"
				/>
				{option.lead}
				<span className="min-w-0 flex-1 truncate">{option.label}</span>
				{option.hint != null ? (
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
						{option.hint}
					</span>
				) : null}
			</CommandItem>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={label}
						className={cn("h-8 gap-1.5 bg-background", className)}
					/>
				}
			>
				<span>{label}</span>
				{selected.length > 0 ? (
					<span className="bg-primary px-1.5 text-2xs text-primary-foreground tabular-nums">
						{selected.length}
					</span>
				) : null}
				<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80 gap-0 p-0">
				<Command shouldFilter={onSearch == null}>
					<CommandInput
						placeholder={
							searchPlaceholder ??
							t("insights.searchLabel", { label: label.toLowerCase() })
						}
						value={query}
						onValueChange={(next) => {
							setQuery(next);
							onSearch?.(next);
						}}
					/>
					<CommandList>
						<CommandEmpty>
							{isLoading
								? t("insights.searching")
								: (emptyText ?? t("insights.nothingFound"))}
						</CommandEmpty>
						{selectedOptions.length > 0 ? (
							<CommandGroup heading={t("insights.selected")}>
								{selectedOptions.map(row)}
							</CommandGroup>
						) : null}
						{rest.length > 0 ? (
							<CommandGroup
								heading={
									selectedOptions.length > 0 ? t("insights.more") : undefined
								}
							>
								{rest.map(row)}
							</CommandGroup>
						) : null}
					</CommandList>
					{selected.length > 0 ? (
						<div className="border-border border-t p-1.5">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() => onChange([])}
							>
								{t("insights.clearLabel", { label: label.toLowerCase() })}
							</Button>
						</div>
					) : null}
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// ── Dates ──────────────────────────────────────────────────────────────────

export type InsightsDateRange = { from: string | null; to: string | null };

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
	return String(value).padStart(2, "0");
}

/** "2025-03-07" in the browser's own calendar (the address holds days, not instants). */
export function toDayKey(date: Date) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayKey(key: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
	if (!match) return null;
	const date = new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
	);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** API input for a range: the start of the first day to the end of the last. */
export function rangeToQuery(range: InsightsDateRange): {
	rangeMin?: Date;
	rangeMax?: Date;
} {
	const from = range.from ? fromDayKey(range.from) : null;
	const to = range.to ? fromDayKey(range.to) : null;
	return {
		...(from ? { rangeMin: from } : {}),
		...(to
			? {
					rangeMax: new Date(
						to.getFullYear(),
						to.getMonth(),
						to.getDate(),
						23,
						59,
						59,
						999,
					),
				}
			: {}),
	};
}

export type InsightsRangePreset = {
	id: "30d" | "90d" | "year" | "last-year";
	range: () => InsightsDateRange;
};

const PRESET_KEYS = {
	"30d": "d30",
	"90d": "d90",
	year: "year",
	"last-year": "lastYear",
} as const;

export const INSIGHTS_RANGE_PRESETS: readonly InsightsRangePreset[] = [
	{
		id: "30d",
		range: () => {
			const now = new Date();
			return {
				from: toDayKey(new Date(now.getTime() - 29 * DAY_MS)),
				to: toDayKey(now),
			};
		},
	},
	{
		id: "90d",
		range: () => {
			const now = new Date();
			return {
				from: toDayKey(new Date(now.getTime() - 89 * DAY_MS)),
				to: toDayKey(now),
			};
		},
	},
	{
		id: "year",
		range: () => {
			const now = new Date();
			return {
				from: toDayKey(new Date(now.getFullYear(), 0, 1)),
				to: toDayKey(new Date(now.getFullYear(), 11, 31)),
			};
		},
	},
	{
		id: "last-year",
		range: () => {
			const year = new Date().getFullYear() - 1;
			return {
				from: toDayKey(new Date(year, 0, 1)),
				to: toDayKey(new Date(year, 11, 31)),
			};
		},
	},
];

type AuthorsT = ReturnType<typeof useTranslations<"authors">>;

function formatDay(f: Formatters, key: string) {
	const date = fromDayKey(key);
	return date
		? f.dateWith(date, { day: "numeric", month: "short", year: "numeric" })
		: key;
}

export function describeRange(
	range: InsightsDateRange,
	f: Formatters,
	t: AuthorsT,
) {
	if (range.from && range.to) {
		return t("insights.rangeFromTo", {
			from: formatDay(f, range.from),
			to: formatDay(f, range.to),
		});
	}
	if (range.from) {
		return t("insights.rangeFrom", { date: formatDay(f, range.from) });
	}
	if (range.to)
		return t("insights.rangeUntil", { date: formatDay(f, range.to) });
	return null;
}

/** A date range with presets and a two-month calendar. "All time" is an empty range. */
export function InsightsRangePicker({
	value,
	onChange,
	label,
	allTimeLabel,
	className,
}: {
	value: InsightsDateRange;
	onChange: (range: InsightsDateRange) => void;
	label?: string;
	allTimeLabel?: string;
	className?: string;
}) {
	const t = useTranslations("authors");
	const f = useFormatters();
	const [open, setOpen] = useState(false);
	const from = value.from ? fromDayKey(value.from) : null;
	const to = value.to ? fromDayKey(value.to) : null;
	const selected:
		| { from: Date | undefined; to?: Date | undefined }
		| undefined =
		from || to ? { from: from ?? undefined, to: to ?? undefined } : undefined;
	const allTime = allTimeLabel ?? t("insights.allTime");
	const text = describeRange(value, f, t) ?? allTime;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label={t("insights.rangeLabel", {
							label: label ?? t("insights.dates"),
							text,
						})}
						className={cn("h-8 gap-1.5 bg-background", className)}
					/>
				}
			>
				<CalendarIcon className="size-3.5 text-muted-foreground" aria-hidden />
				<span className="truncate">{text}</span>
				<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto gap-0 p-0">
				<div className="flex flex-col sm:flex-row">
					<ul className="flex flex-row flex-wrap gap-1 border-border border-b p-2 sm:w-36 sm:flex-col sm:border-r sm:border-b-0">
						<li className="contents">
							<Button
								type="button"
								variant={!value.from && !value.to ? "secondary" : "ghost"}
								size="sm"
								className="justify-start"
								onClick={() => {
									onChange({ from: null, to: null });
									setOpen(false);
								}}
							>
								{allTime}
							</Button>
						</li>
						{INSIGHTS_RANGE_PRESETS.map((preset) => (
							<li key={preset.id} className="contents">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="justify-start"
									onClick={() => {
										onChange(preset.range());
										setOpen(false);
									}}
								>
									{t(`insights.preset.${PRESET_KEYS[preset.id]}`)}
								</Button>
							</li>
						))}
					</ul>
					<Calendar
						mode="range"
						numberOfMonths={2}
						selected={selected}
						defaultMonth={from ?? undefined}
						onSelect={(range) =>
							onChange({
								from: range?.from ? toDayKey(range.from) : null,
								to: range?.to ? toDayKey(range.to) : null,
							})
						}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}

/** "Clear filters" shown only while something narrows the list. */
export function InsightsClearButton({
	active,
	onClear,
}: {
	active: boolean;
	onClear: () => void;
}) {
	const t = useTranslations("authors");
	if (!active) return null;
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="h-8 gap-1"
			onClick={onClear}
		>
			<X className="size-3.5" aria-hidden />
			{t("insights.clearFilters")}
		</Button>
	);
}
