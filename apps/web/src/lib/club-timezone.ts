import type { UserPreferences } from "@bbrc/shared";
import { resolveClubTimeZone } from "@bbrc/shared";
import { ENV } from "@/env";
import { formatDateTimeInTimeZone } from "@/lib/format-datetime";

/** Club IANA timezone for deadline pickers (matches server `CLUB_TIMEZONE`). */
export const clubTimeZone = resolveClubTimeZone(ENV.CLUB_TIMEZONE);

/**
 * Deadline display in club time by default, so server and client renders
 * always agree. Pass a member's `time` preferences to show their own time zone
 * or clock style (only from client components, after hydration).
 */
export function formatClubDateTime(
	value: Date | string,
	time?: UserPreferences["time"],
): string {
	if (!time || (time.zone === "club" && time.clock === "auto")) {
		return formatDateTimeInTimeZone(value, clubTimeZone);
	}

	return formatDateTimeInTimeZone(
		value,
		time.zone === "club" ? clubTimeZone : undefined,
		{
			hour12: time.clock === "auto" ? undefined : time.clock === "12h",
			showZone: time.zone === "device",
		},
	);
}
