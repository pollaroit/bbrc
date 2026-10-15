import type { Database, DatabaseTransaction } from "@bbrc/db";
import { generateUniqueSlug } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

const SERIES_SLUG_MIN_LENGTH = 3;

async function isSeriesSlugAvailable(
	slug: string,
	db: Database | DatabaseTransaction,
): Promise<boolean> {
	return (await db.series.findUnique({ where: { slug } })) == null;
}

export async function generateSeriesSlug(
	title: string,
	db: Database | DatabaseTransaction,
): Promise<string> {
	const candidates = [title.trim(), `series-${title.trim()}`, "book-series"];

	for (const seed of candidates) {
		if (!seed) {
			continue;
		}

		try {
			const slug = await generateUniqueSlug(seed, (candidate) =>
				isSeriesSlugAvailable(candidate, db),
			);

			if (slug.length >= SERIES_SLUG_MIN_LENGTH) {
				return slug;
			}
		} catch {
			// try next seed
		}
	}

	throw new ORPCError("CONFLICT", {
		message: "Failed to generate series slug",
		data: { title },
	});
}
