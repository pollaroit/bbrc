import { LOCALE_INTL_TAGS, type Locale } from "./locales";

/**
 * Numbers, dates, times and lists in the words and symbols of a language ("4,5" in Azerbaijani,
 * "4.5" in English). Pure functions that take the locale, so they run in the browser, in server
 * components and in API code alike. `Intl` instances are cached per language and options.
 */

const EM_DASH = "—";

const cache = new Map<string, unknown>();

function cached<T>(
	kind: string,
	locale: Locale,
	options: object | undefined,
	create: (tag: string) => T,
): T {
	const key = `${kind}|${locale}|${options ? JSON.stringify(options) : ""}`;
	let value = cache.get(key) as T | undefined;
	if (value === undefined) {
		value = create(LOCALE_INTL_TAGS[locale]);
		cache.set(key, value);
	}
	return value;
}

function toDate(value: Date | string | number): Date | null {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNumber(
	locale: Locale,
	value: number,
	options?: Intl.NumberFormatOptions,
): string {
	return cached(
		"number",
		locale,
		options,
		(tag) => new Intl.NumberFormat(tag, options),
	).format(value);
}

/** A fixed number of decimals ("4,50" with 2). */
export function formatDecimal(
	locale: Locale,
	value: number,
	digits: number,
): string {
	return formatNumber(locale, value, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});
}

/** A rating out of 5 with at most one decimal; whole numbers have none ("4" and "4,5"). */
export function formatRating(locale: Locale, value: number): string {
	return formatNumber(locale, value, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 1,
	});
}

/** `0.42` as "42%". */
export function formatPercent(
	locale: Locale,
	ratio: number,
	digits = 0,
): string {
	return formatNumber(locale, ratio, {
		style: "percent",
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	});
}

/** 12345 as "12K" ("12 min" in some languages). */
export function formatCompactNumber(locale: Locale, value: number): string {
	return formatNumber(locale, value, { notation: "compact" });
}

export type DateStyle = "short" | "medium" | "long" | "full";

export function formatDate(
	locale: Locale,
	value: Date | string | number,
	style: DateStyle = "medium",
	options: { timeZone?: string } = {},
): string {
	const date = toDate(value);
	if (!date) return EM_DASH;
	return cached(
		"date",
		locale,
		{ style, ...options },
		(tag) => new Intl.DateTimeFormat(tag, { dateStyle: style, ...options }),
	).format(date);
}

export function formatDateTime(
	locale: Locale,
	value: Date | string | number,
	options: {
		dateStyle?: DateStyle;
		timeStyle?: "short" | "medium";
		timeZone?: string;
		hour12?: boolean;
	} = {},
): string {
	const date = toDate(value);
	if (!date) return EM_DASH;
	const resolved = { dateStyle: "medium", timeStyle: "short", ...options };
	return cached(
		"datetime",
		locale,
		resolved,
		(tag) =>
			new Intl.DateTimeFormat(tag, resolved as Intl.DateTimeFormatOptions),
	).format(date);
}

/** "27 Oct, 15:18": day, short month and time without the year. */
export function formatDateTimeCompact(
	locale: Locale,
	value: Date | string | number,
	options: { timeZone?: string; hour12?: boolean } = {},
): string {
	const date = toDate(value);
	if (!date) return EM_DASH;
	const resolved = {
		day: "numeric",
		month: "short",
		hour: "numeric",
		minute: "2-digit",
		...options,
	} satisfies Intl.DateTimeFormatOptions;
	return cached(
		"compact",
		locale,
		resolved,
		(tag) => new Intl.DateTimeFormat(tag, resolved),
	).format(date);
}

/** "Oct 2026" from a Date or a { year, month } (month 1 to 12, read as UTC). */
export function formatMonthYear(
	locale: Locale,
	value: Date | { year: number; month: number },
	style: "short" | "long" = "short",
): string {
	const date =
		value instanceof Date
			? value
			: new Date(Date.UTC(value.year, value.month - 1, 1));
	if (Number.isNaN(date.getTime())) return EM_DASH;
	const resolved = { month: style, year: "numeric", timeZone: "UTC" } as const;
	return cached(
		"month-year",
		locale,
		resolved,
		(tag) => new Intl.DateTimeFormat(tag, resolved),
	).format(date);
}

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
	{ unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
	{ unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
	{ unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
	{ unit: "day", ms: 24 * 60 * 60 * 1000 },
	{ unit: "hour", ms: 60 * 60 * 1000 },
	{ unit: "minute", ms: 60 * 1000 },
	{ unit: "second", ms: 1000 },
];

/** "3 days ago" / "3 gün öncə" / "in 2 hours": the largest unit that fits, "now" under 10 seconds. */
export function formatRelativeTime(
	locale: Locale,
	value: Date | string | number,
	now: Date = new Date(),
): string {
	const date = toDate(value);
	if (!date) return EM_DASH;
	const formatter = cached(
		"relative",
		locale,
		undefined,
		(tag) => new Intl.RelativeTimeFormat(tag, { numeric: "auto" }),
	);
	const delta = date.getTime() - now.getTime();
	const abs = Math.abs(delta);
	if (abs < 10_000) return formatter.format(0, "second");
	for (const { unit, ms } of RELATIVE_UNITS) {
		if (abs >= ms) return formatter.format(Math.round(delta / ms), unit);
	}
	return formatter.format(0, "second");
}

/** "a, b and c" / "a, b və c". */
export function formatList(
	locale: Locale,
	items: readonly string[],
	type: "conjunction" | "disjunction" = "conjunction",
): string {
	return cached(
		"list",
		locale,
		{ type },
		(tag) => new Intl.ListFormat(tag, { type, style: "long" }),
	).format(items);
}

/** Every helper above with the language already filled in: `const f = createFormatters("az"); f.rating(4.5)`. */
export function createFormatters(locale: Locale) {
	return {
		locale,
		number: (value: number, options?: Intl.NumberFormatOptions) =>
			formatNumber(locale, value, options),
		decimal: (value: number, digits: number) =>
			formatDecimal(locale, value, digits),
		rating: (value: number) => formatRating(locale, value),
		percent: (ratio: number, digits?: number) =>
			formatPercent(locale, ratio, digits),
		compact: (value: number) => formatCompactNumber(locale, value),
		date: (
			value: Date | string | number,
			style?: DateStyle,
			options?: { timeZone?: string },
		) => formatDate(locale, value, style, options),
		dateTime: (
			value: Date | string | number,
			options?: Parameters<typeof formatDateTime>[2],
		) => formatDateTime(locale, value, options),
		dateTimeCompact: (
			value: Date | string | number,
			options?: Parameters<typeof formatDateTimeCompact>[2],
		) => formatDateTimeCompact(locale, value, options),
		monthYear: (
			value: Date | { year: number; month: number },
			style?: "short" | "long",
		) => formatMonthYear(locale, value, style),
		relativeTime: (value: Date | string | number, now?: Date) =>
			formatRelativeTime(locale, value, now),
		list: (items: readonly string[], type?: "conjunction" | "disjunction") =>
			formatList(locale, items, type),
	};
}

export type Formatters = ReturnType<typeof createFormatters>;
