import type { Database } from "@bbrc/db";
import { evaluateAchievementsForUser } from "../achievement/achievement.service";

/**
 * Re-checks the reading-based achievements (finished on time, streaks, wishlist
 * size) right after something that can earn them. The daily sweep still covers
 * anything missed, so a failure here is only logged.
 */
export async function checkReadingAchievements(
	db: Database,
	userId: string,
): Promise<void> {
	try {
		await evaluateAchievementsForUser(db, userId, { sections: ["reading"] });
	} catch (error) {
		console.error("reading achievements failed", error);
	}
}
