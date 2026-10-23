import type { FactSection } from "@bbrc/shared";
import { o } from "../../o";
import { evaluateAchievementsForUser } from "./achievement.service";

/**
 * Re-checks the caller's achievements after a mutation succeeds. A failure
 * here must never fail the action itself, so errors are logged and dropped.
 */
export const checkAchievementsAfter = (...sections: FactSection[]) =>
	o.middleware(async ({ context, next }) => {
		const result = await next();
		const userId = context.session?.user?.id;
		if (userId) {
			try {
				await evaluateAchievementsForUser(context.db, userId, { sections });
			} catch (error) {
				console.error("Achievement check failed", error);
			}
		}
		return result;
	});
