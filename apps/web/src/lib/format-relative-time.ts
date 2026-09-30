const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: "auto",
});

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
	{ unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
	{ unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
	{ unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
	{ unit: "day", ms: 24 * 60 * 60 * 1000 },
	{ unit: "hour", ms: 60 * 60 * 1000 },
	{ unit: "minute", ms: 60 * 1000 },
	{ unit: "second", ms: 1000 },
];

export function formatRelativeTime(
	value: Date | string,
	now: Date = new Date(),
): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	const deltaMs = date.getTime() - now.getTime();
	const absMs = Math.abs(deltaMs);

	if (absMs < 10_000) {
		return relativeTimeFormatter.format(0, "second");
	}

	for (const { unit, ms } of UNITS) {
		if (absMs >= ms) {
			const amount = Math.round(deltaMs / ms);
			return relativeTimeFormatter.format(amount, unit);
		}
	}

	return relativeTimeFormatter.format(0, "second");
}
