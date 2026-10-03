import type { DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const DOCUMENT_SLUG_MIN_LENGTH = 3;

async function isDocumentSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<boolean> {
	return (await db.document.findUnique({ where: { slug } })) == null;
}

function documentSlugSeedFromName(name: string): string {
	const trimmed = name.trim();
	if (trimmed.length >= DOCUMENT_SLUG_MIN_LENGTH) {
		return trimmed;
	}
	return "club-document";
}

export async function generateDocumentSlug(
	name: string,
	db: DatabaseTransaction,
): Promise<string> {
	const seeds = [documentSlugSeedFromName(name), "club-document"];

	for (const seed of seeds) {
		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isDocumentSlugAvailable(candidate, db),
			);

			if (slug.length >= DOCUMENT_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate document slug",
	});
}
