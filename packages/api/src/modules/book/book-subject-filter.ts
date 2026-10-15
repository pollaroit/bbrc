import type { Database } from "@bbrc/db";
import { subjectNameToSlug } from "@bbrc/shared";

export async function resolveSubjectSlugsToNames(
	slugs: string[],
	db: Database,
): Promise<string[]> {
	if (slugs.length === 0) {
		return [];
	}

	const slugSet = new Set(slugs);
	const matched = new Map<string, string>();

	const rows = await db.book.findMany({
		select: { subjects: true },
	});

	for (const row of rows) {
		for (const name of row.subjects) {
			const slug = subjectNameToSlug(name);
			if (slugSet.has(slug) && !matched.has(slug)) {
				matched.set(slug, name);
			}
		}
	}

	return slugs.flatMap((slug) => {
		const name = matched.get(slug);
		return name != null ? [name] : [];
	});
}
