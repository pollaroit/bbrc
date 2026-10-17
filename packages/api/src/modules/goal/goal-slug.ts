import type { Database, DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";

const GOAL_SLUG_MIN_LENGTH = 3;

async function isGoalSlugAvailable(
	userId: string,
	slug: string,
	db: Database | DatabaseTransaction,
): Promise<boolean> {
	const existing = await db.goal.findUnique({
		where: { userId_slug: { userId, slug } },
		select: { id: true },
	});
	return existing == null;
}

export async function generateGoalSlug(
	title: string,
	userId: string,
	db: Database | DatabaseTransaction,
): Promise<string> {
	const trimmed = title.trim();
	const seeds =
		trimmed.length >= GOAL_SLUG_MIN_LENGTH
			? [trimmed, "reading-goal"]
			: ["reading-goal"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isGoalSlugAvailable(userId, candidate, db),
			);
			if (slug.length >= GOAL_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {
			// try next seed
		}
	}

	throw new Error("Failed to generate goal slug");
}
