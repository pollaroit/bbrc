import type { Database } from "@bbrc/db";
import { appError } from "../../lib/app-error";
import type { THealthOutputSchema } from "./health.schema";

export async function check(db: Database): Promise<THealthOutputSchema> {
	try {
		await db.user.count();
		return {
			api: "ok",
			database: "ok",
		};
	} catch {
		throw appError("INTERNAL_SERVER_ERROR", "common.apiUnreachable");
	}
}
