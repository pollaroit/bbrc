import { resolveClubTimeZone } from "@bbrc/shared";
import { ENV } from "@/env";
import { formatDateTimeInTimeZone } from "@/lib/format-datetime";

/** Club IANA timezone for deadline pickers (matches server `CLUB_TIMEZONE`). */
export const clubTimeZone = resolveClubTimeZone(ENV.CLUB_TIMEZONE);

/** Deadline display in club time, so server and client renders always agree. */
export function formatClubDateTime(value: Date | string): string {
	return formatDateTimeInTimeZone(value, clubTimeZone);
}
