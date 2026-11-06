import type { Context as ApiContext } from "@bbrc/api/context";
import type { NextRequest } from "next/server";
import { createIsrRevalidator } from "@/lib/isr-revalidation";
import { cacheGet, cacheSet } from "@/lib/redis";
import { auth, db } from "./services";

export async function createContext(req: NextRequest): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		db,
		session,
		revalidateIsr: createIsrRevalidator(),
		cache: { get: cacheGet, set: cacheSet },
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
