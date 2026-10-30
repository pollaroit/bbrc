import { peekPost } from "@bbrc/api/modules/visibility/peek";
import { ANONYMOUS_VIEWER, contentPlainText } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockedPostGate } from "@/components/blocks/locked-post-gate";
import { PostDetail } from "@/components/blocks/post-detail";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { loadPostBySlugForIsr } from "@/lib/isr-data";
import {
	blogPostingJsonLd,
	buildNotFoundMetadata,
	buildPageMetadata,
	JsonLd,
	NO_INDEX_ROBOTS,
	postSlugStaticParams,
} from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return postSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const post = await loadPostBySlugForIsr(slug);
		const excerpt = contentPlainText(post.content).trim().slice(0, 160);

		return buildPageMetadata({
			title: `Post by ${post.author.name}`,
			description: excerpt || "BBRC club post.",
			path: `/posts/${post.slug}`,
			openGraph: { type: "article" },
		});
	} catch {
		// Friends-only: a card for the owner and nothing of the post; only-me: not found.
		const peek = await peekPost(db, ANONYMOUS_VIEWER, slug).catch(() => null);
		if (peek?.state === "locked") {
			return buildPageMetadata({
				title: `Friends-only post by ${peek.author.name}`,
				description: `Only ${peek.author.name}'s friends can open this post.`,
				path: `/posts/${slug}`,
				robots: NO_INDEX_ROBOTS,
			});
		}
		return buildNotFoundMetadata("Post");
	}
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
	const { slug } = await params;

	try {
		const post = await loadPostBySlugForIsr(slug);

		return (
			<>
				<JsonLd
					data={blogPostingJsonLd({
						slug: post.slug,
						content: contentPlainText(post.content),
						authorName: post.author.name,
						createdAt: post.createdAt,
					})}
				/>
				<TrackDetailView resource="post" itemRef={post.slug} />
				<PostDetail post={post} />
			</>
		);
	} catch {
		const peek = await peekPost(db, ANONYMOUS_VIEWER, slug).catch(() => null);
		if (peek?.state === "locked") {
			return <LockedPostGate slug={slug} author={peek.author} />;
		}
		notFound();
	}
}
