const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function formatDateTime(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return dateTimeFormatter.format(date);
}

export function formatDateTimeInTimeZone(
	value: Date | string,
	timeZone: string,
): string {
	const date = typeof value === "string" ? new Date(value) : value;

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	}).format(date);
}
