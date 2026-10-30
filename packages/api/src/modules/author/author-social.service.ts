import type { Database } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import { getPostListForWhere } from "../post/post.service";
import type { AuthorPostsOutput } from "./author.schema";
import { authorSlugSet, resolveAuthor } from "./author-resolve";

/** A post attaches an author by the slug it had at the time, so merged slugs count too. */
async function attachmentWhere(db: Database, slug: string, viewer: Viewer) {
	const author = await resolveAuthor(db, slug, viewer);
	const slugs = await authorSlugSet(db, author);
	return { kind: "author" as const, authorSlug: { in: slugs } };
}

export async function getAuthorPosts(
	input: { slug: string; cursor?: string; limit: number },
	db: Database,
	viewer: Viewer,
): Promise<AuthorPostsOutput> {
	const attachment = await attachmentWhere(db, input.slug, viewer);
	return getPostListForWhere(
		{ where: { attachment }, limit: input.limit, cursor: input.cursor },
		db,
		viewer,
	);
}
