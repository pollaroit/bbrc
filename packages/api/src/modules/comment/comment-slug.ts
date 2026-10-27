import type { DatabaseTransaction } from "@bbrc/db";
import { contentPlainText, generateUniqueSlug } from "@bbrc/shared";
import { appError } from "../../lib/app-error";

const COMMENT_SLUG_MIN_LENGTH = 3;

async function isCommentSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.comment.findUnique({ where: { slug } })) == null;
}

function commentSlugSeedFromContent(content: string): string {
	const line = contentPlainText(content)
		.trim()
		.split(/\s+/)
		.slice(0, 8)
		.join(" ");

	if (line.length >= COMMENT_SLUG_MIN_LENGTH) {
		return line;
	}

	return "club-comment";
}

export async function generateCommentSlug(
	content: string,
	db: DatabaseTransaction,
): Promise<string> {
	const seeds = [commentSlugSeedFromContent(content), "club-comment"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isCommentSlugAvailable(candidate, db),
			);

			if (slug.length >= COMMENT_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw appError("CONFLICT", "comment.slugFailed");
}
