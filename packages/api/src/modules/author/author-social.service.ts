import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import { getPostListForWhere } from "../post/post.service";
import { viewerFromSession } from "../user/user-visibility";
import type { AuthorPostsOutput } from "./author.schema";
import { authorSlugSet, resolveAuthor } from "./author-resolve";

/** A post attaches an author by the slug it had at the time, so merged slugs count too. */
async function attachmentWhere(
	db: Database,
	slug: string,
	session: Session | null,
) {
	const author = await resolveAuthor(db, slug, viewerFromSession(session));
	const slugs = await authorSlugSet(db, author);
	return { kind: "author" as const, authorSlug: { in: slugs } };
}

export async function getAuthorPosts(
	input: { slug: string; cursor?: string; limit: number },
	db: Database,
	session: Session | null,
): Promise<AuthorPostsOutput> {
	const attachment = await attachmentWhere(db, input.slug, session);
	return getPostListForWhere(
		{ where: { attachment }, limit: input.limit, cursor: input.cursor },
		db,
		session,
	);
}
