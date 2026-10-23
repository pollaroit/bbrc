const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

const compactDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	hour: "numeric",
	minute: "2-digit",
});

/** "2:00 PM" -> "2PM", "3:46 PM" -> "3:46PM". */
function tidyTime(text: string): string {
	return text
		.replace(/:00[\s\u202f\u00a0]*(AM|PM)/gi, "$1")
		.replace(/[\s\u202f\u00a0]+(AM|PM)/gi, "$1");
}

export function formatDateTimeCompact(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return tidyTime(compactDateTimeFormatter.format(date));
}

export function formatDateTime(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return tidyTime(dateTimeFormatter.format(date));
}

export function formatDateTimeInTimeZone(
	value: Date | string,
	timeZone: string | undefined,
	options: { hour12?: boolean; showZone?: boolean } = {},
): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return tidyTime(
		new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
			...(timeZone ? { timeZone } : {}),
			...(options.hour12 === undefined ? {} : { hour12: options.hour12 }),
		}).format(date) +
			(options.showZone
				? ` ${
						new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
							.formatToParts(date)
							.find((part) => part.type === "timeZoneName")?.value ?? ""
					}`
				: ""),
	);
}

/** Human-readable time until `target` from `now` (for cooldown copy). */
export function formatDurationUntil(
	target: Date | string,
	now: Date = new Date(),
): string {
	const date = typeof target === "string" ? new Date(target) : target;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	const ms = date.getTime() - now.getTime();
	if (ms <= 0) {
		return "now";
	}

	const minuteMs = 60 * 1000;
	const hourMs = 60 * minuteMs;
	const dayMs = 24 * hourMs;

	const days = Math.floor(ms / dayMs);
	if (days >= 1) {
		return days === 1 ? "1 day" : `${days} days`;
	}

	const hours = Math.floor(ms / hourMs);
	if (hours >= 1) {
		return hours === 1 ? "1 hour" : `${hours} hours`;
	}

	const minutes = Math.max(1, Math.ceil(ms / minuteMs));
	return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
