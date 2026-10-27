import type { Context as ApiContext } from "@bbrc/api/context";
import { LOCALE_HEADER, localeFromHeader } from "@bbrc/api/lib/locale";
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
		locale: localeFromHeader(req.headers.get(LOCALE_HEADER)),
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
