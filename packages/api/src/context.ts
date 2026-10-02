import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";

import type { IsrRevalidator } from "./isr-revalidation";

export type Context = {
	session: Session | null;
	db: Database;
	revalidateIsr?: IsrRevalidator;
};
