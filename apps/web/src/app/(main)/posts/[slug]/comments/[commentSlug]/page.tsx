import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blocks/post-detail";
import { loadPostBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	truncateDescription,
} from "@/lib/seo";
import { truncateOgTitle } from "@/lib/seo/og/helpers";
import { db } from "@/services";

/** On-demand only — too many comments for static generation or sitemap. */
export const dynamic = "force-dynamic";

/** Cached pages are built for an anonymous visitor. */
const anonymousSession = ANONYMOUS_VIEWER;

export async function generateMetadata({
	params,
}: PageProps<"/posts/[slug]/comments/[commentSlug]">): Promise<Metadata> {
	const { slug, commentSlug } = await params;

	try {
		const [comment, post] = await Promise.all([
			getCommentBySlug(commentSlug, db, anonymousSession),
			getPostBySlug(slug, db, anonymousSession),
		]);
		if (comment.postSlug !== slug) {
			return buildNotFoundMetadata("Comment");
		}

		return buildPageMetadata({
			title: truncateOgTitle(comment.content),
			description: truncateDescription(
				`@${comment.author.username} · post by ${post.author.name}`,
			),
			path: `/posts/${slug}/comments/${commentSlug}`,
			openGraph: { type: "article" },
		});
	} catch {
		return buildNotFoundMetadata("Comment");
	}
}

export default async function PostCommentPage({
	params,
}: PageProps<"/posts/[slug]/comments/[commentSlug]">) {
	const { slug, commentSlug } = await params;

	let post: Awaited<ReturnType<typeof loadPostBySlugForIsr>>;
	let comment: Awaited<ReturnType<typeof getCommentBySlug>>;

	try {
		[post, comment] = await Promise.all([
			loadPostBySlugForIsr(slug),
			getCommentBySlug(commentSlug, db, anonymousSession),
		]);
	} catch {
		notFound();
	}

	if (comment.postSlug !== slug) {
		notFound();
	}

	return (
		<PostDetail
			post={post}
			commentFocusSlug={commentSlug}
			showCommentsSection={false}
		/>
	);
}
