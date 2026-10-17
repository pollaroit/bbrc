import type { DatabaseTransaction } from "@bbrc/db";
import {
	contentPlainText,
	generateSlug,
	generateUniqueSlug,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const FEEDBACK_SLUG_MIN_LENGTH = 3;
const EMPTY_REVIEW_SLUG_ATTEMPTS = 40;

async function isFeedbackSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.feedback.findUnique({ where: { slug } })) == null;
}

function feedbackSlugSeedFromReview(review: string): string | null {
	const line = contentPlainText(review)
		.trim()
		.split(/\s+/)
		.slice(0, 8)
		.join(" ");

	if (line.length >= FEEDBACK_SLUG_MIN_LENGTH) {
		return line;
	}

	return null;
}

function randomEmptyReviewSlugSeed(): string {
	const suffix = Math.floor(Math.random() * 1_000_000_000_000)
		.toString()
		.padStart(12, "0");
	return `club-review-${suffix}`;
}

async function generateEmptyReviewFeedbackSlug(
	db: DatabaseTransaction,
): Promise<string> {
	for (let attempt = 0; attempt < EMPTY_REVIEW_SLUG_ATTEMPTS; attempt++) {
		const candidate = generateSlug(randomEmptyReviewSlugSeed());
		if (
			candidate.length >= FEEDBACK_SLUG_MIN_LENGTH &&
			(await isFeedbackSlugAvailable(candidate, db))
		) {
			return candidate;
		}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate feedback slug",
	});
}

export async function generateFeedbackSlug(
	review: string,
	db: DatabaseTransaction,
): Promise<string> {
	const textSeed = feedbackSlugSeedFromReview(review);

	if (textSeed) {
		try {
			const slug = await generateUniqueSlug(textSeed, (candidate) =>
				isFeedbackSlugAvailable(candidate, db),
			);

			if (slug.length >= FEEDBACK_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {
			// fall through to random empty-review slugs
		}
	}

	return generateEmptyReviewFeedbackSlug(db);
}
