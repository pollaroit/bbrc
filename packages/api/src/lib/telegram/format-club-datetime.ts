import { resolveClubTimeZone } from "@bbrc/shared";

export function formatClubDateTime(value: Date): string {
	const timeZone = resolveClubTimeZone();
	return new Intl.DateTimeFormat("en-GB", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	}).format(value);
}
