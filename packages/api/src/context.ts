import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";

import type { IsrRevalidator } from "./isr-revalidation";

/** A small shared cache with a lifetime, supplied by the web app (Redis). Absent means no caching. */
export type ApiCache = {
	get: <T>(key: string) => Promise<T | null>;
	set: (key: string, value: unknown, ttlSeconds: number) => Promise<void>;
};

export type Context = {
	session: Session | null;
	db: Database;
	revalidateIsr?: IsrRevalidator;
	cache?: ApiCache;
};
