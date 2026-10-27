"use client";

import { toLocale } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { formatClubDateTime } from "@/lib/club-timezone";
import { usePreferences } from "@/lib/preferences/use-preferences";

/**
 * A date and time in club time by default. Members can switch to their own
 * time zone or a 12/24-hour clock in Preferences. Server and first client
 * render always use the defaults, so there is no hydration mismatch.
 */
export function ClubDateTime({ value }: { value: Date | string }) {
	const { time } = usePreferences();
	const locale = toLocale(useLocale());
	const date = typeof value === "string" ? new Date(value) : value;

	return (
		<time
			dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}
			suppressHydrationWarning
		>
			{formatClubDateTime(date, time, locale)}
		</time>
	);
}
