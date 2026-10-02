import type { Context as ApiContext } from "@bbrc/api/context";
import type { NextRequest } from "next/server";
import { createIsrRevalidator } from "@/lib/isr-revalidation";
import { auth, db } from "./services";

export async function createContext(req: NextRequest): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		db,
		session,
		revalidateIsr: createIsrRevalidator(),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
