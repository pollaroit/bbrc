import type { AuthorGetOutput } from "@bbrc/api/modules/author/author.schema";
import type { Metadata } from "next";
import {
	buildPageMetadata,
	NO_INDEX_ROBOTS,
	truncateDescription,
} from "@/lib/seo";

type AuthorMetaSource = Pick<AuthorGetOutput, "profile" | "numbers">;

export function authorPageDescription(author: AuthorMetaSource): string {
	const { profile, numbers } = author;
	const bio = profile.bio?.trim();
	if (bio) {
		return truncateDescription(bio);
	}

	const facts = [profile.lifespan, profile.nationalities[0]?.name].filter(
		Boolean,
	);
	const lead = facts.length > 0 ? `${profile.name} (${facts.join(", ")}).` : "";
	const catalog =
		numbers.bookCount === 1 ? "1 book" : `${numbers.bookCount} books`;

	return `${lead} ${catalog} by ${profile.name} in the BBRC library, with club reads, reviews and related authors.`.trim();
}

export function buildAuthorPageMetadata(
	author: AuthorMetaSource,
	tab?: { title: string; description: string; segment: string },
): Metadata {
	const base = `/authors/${author.profile.slug}`;

	return buildPageMetadata({
		title: tab ? `${author.profile.name} · ${tab.title}` : author.profile.name,
		description: tab?.description ?? authorPageDescription(author),
		path: tab?.segment ? `${base}/${tab.segment}` : base,
		openGraph: { type: "profile" },
		// An author without books has nothing to index.
		...(author.numbers.bookCount === 0 ? { robots: NO_INDEX_ROBOTS } : {}),
	});
}
