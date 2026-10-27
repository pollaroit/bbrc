import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import type { Locale } from "@bbrc/i18n";

import type { IsrRevalidator } from "./isr-revalidation";

export type Context = {
	session: Session | null;
	db: Database;
	revalidateIsr?: IsrRevalidator;
	/** The language the page that made the call is in (the `x-locale` header); English when absent. */
	locale?: Locale;
};
