import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";

export type Context = {
	session: Session | null;
	db: Database;
};
