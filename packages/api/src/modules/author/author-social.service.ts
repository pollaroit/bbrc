import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import { richContentPreview } from "@bbrc/shared";
import { getCommentListForWhere } from "../comment/comment.service";
import { getPostListForWhere } from "../post/post.service";
import { viewerFromSession } from "../user/user-visibility";
import type { AuthorCommentsOutput, AuthorPostsOutput } from "./author.schema";
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

export async function getAuthorComments(
	input: { slug: string; cursor?: string; limit: number },
	db: Database,
	session: Session | null,
): Promise<AuthorCommentsOutput> {
	const attachment = await attachmentWhere(db, input.slug, session);
	const page = await getCommentListForWhere(
		{
			where: { post: { attachment } },
			limit: input.limit,
			cursor: input.cursor,
		},
		db,
		session,
	);

	const posts =
		page.items.length === 0
			? []
			: await db.comment.findMany({
					where: { slug: { in: page.items.map((item) => item.slug) } },
					select: {
						slug: true,
						post: { select: { slug: true, content: true } },
					},
				});
	const postByComment = new Map(posts.map((row) => [row.slug, row.post]));

	return {
		items: page.items.map((item) => {
			const post = postByComment.get(item.slug);
			return {
				...item,
				post: post
					? { slug: post.slug, excerpt: richContentPreview(post.content, 120) }
					: null,
			};
		}),
		metadata: page.metadata,
	};
}
