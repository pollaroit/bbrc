import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blocks/post-detail";
import { loadPostBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	truncateDescription,
} from "@/lib/seo";
import { db } from "@/services";

/** On-demand only — too many comments for static generation or sitemap. */
export const dynamic = "force-dynamic";

const anonymousSession = null;

export async function generateMetadata({
	params,
}: PageProps<"/posts/[slug]/comments/[commentSlug]">): Promise<Metadata> {
	const { slug, commentSlug } = await params;

	try {
		const comment = await getCommentBySlug(commentSlug, db, anonymousSession);
		if (comment.postSlug !== slug) {
			return buildNotFoundMetadata("Comment");
		}

		return buildPageMetadata({
			title: `Comment by ${comment.author.name}`,
			description:
				truncateDescription(comment.content) ||
				`Comment on a BBRC post by @${comment.author.username}.`,
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
