import type { DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const FEEDBACK_SLUG_MIN_LENGTH = 3;

async function isFeedbackSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.feedback.findUnique({ where: { slug } })) == null;
}

function feedbackSlugSeedFromReview(review: string): string {
	const line = review.trim().split(/\s+/).slice(0, 8).join(" ");

	if (line.length >= FEEDBACK_SLUG_MIN_LENGTH) {
		return line;
	}

	return "club-review";
}

export async function generateFeedbackSlug(
	review: string,
	db: DatabaseTransaction,
): Promise<string> {
	const seeds = [feedbackSlugSeedFromReview(review), "club-review"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isFeedbackSlugAvailable(candidate, db),
			);

			if (slug.length >= FEEDBACK_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate feedback slug",
	});
}
