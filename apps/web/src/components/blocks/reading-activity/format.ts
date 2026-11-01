/** Small formatters for the reading page. Days are club days (`YYYY-MM-DD`). */

function parse(key: string): Date {
	const [y, m, d] = key.split("-").map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "Tue 28 Oct", with the year when it is not this one. */
export function formatDayLabel(key: string): string {
	const date = parse(key);
	const sameYear = date.getFullYear() === new Date().getFullYear();
	return date.toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short",
		...(sameYear ? {} : { year: "numeric" }),
	});
}

/** "November 2026". */
export function formatMonthLabel(key: string): string {
	return parse(`${key}-01`).toLocaleDateString("en-GB", {
		month: "long",
		year: "numeric",
	});
}

/** "Week of 2 Nov". */
export function formatWeekLabel(startKey: string): string {
	return `Week of ${parse(startKey).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
	})}`;
}

/** "14:05", in the browser's time zone. */
export function formatClockTime(value: Date | string): string {
	return new Date(value).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatSpeed(pagesPerHour: number): string {
	return `${Math.round(pagesPerHour)} pages per hour`;
}

export function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

/** The last day of the month a `YYYY-MM` key names. */
export function monthEndKey(key: string): string {
	const [y, m] = key.split("-").map(Number);
	const last = new Date(Date.UTC(y ?? 1970, m ?? 1, 0)).getUTCDate();
	return `${key}-${String(last).padStart(2, "0")}`;
}

/** "2 Nov to 8 Nov", or just "2 Nov" for one day. */
export function formatDayRange(from: string, to: string): string {
	const short = (key: string) => {
		const [y, m, d] = key.split("-").map(Number);
		return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(
			"en-GB",
			{ day: "numeric", month: "short" },
		);
	};
	return from === to ? short(from) : `${short(from)} to ${short(to)}`;
}
