import type { DatabaseTransaction } from "@bbrc/db";
import { contentPlainText, generateUniqueSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const POST_SLUG_MIN_LENGTH = 3;

async function isPostSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.post.findUnique({ where: { slug } })) == null;
}

function postSlugSeedFromContent(content: string): string {
	const line = contentPlainText(content)
		.trim()
		.split(/\s+/)
		.slice(0, 8)
		.join(" ");

	if (line.length >= POST_SLUG_MIN_LENGTH) {
		return line;
	}

	return "club-post";
}

export async function generatePostSlug(
	content: string,
	db: DatabaseTransaction,
): Promise<string> {
	const seeds = [postSlugSeedFromContent(content), "club-post"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isPostSlugAvailable(candidate, db),
			);

			if (slug.length >= POST_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate post slug",
	});
}
