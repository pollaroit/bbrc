import { resolveClubTimeZone } from "@bbrc/shared";
import { ENV } from "@/env";

/** Club IANA timezone for deadline pickers (matches server `CLUB_TIMEZONE`). */
export const clubTimeZone = resolveClubTimeZone(ENV.CLUB_TIMEZONE);
