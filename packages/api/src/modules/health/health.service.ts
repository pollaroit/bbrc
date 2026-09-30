import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import type { THealthOutputSchema } from "./health.schema";

export async function check(db: Database): Promise<THealthOutputSchema> {
	try {
		await db.user.count();
		return {
			api: "ok",
			database: "ok",
		};
	} catch {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to connect to the API.",
		});
	}
}
