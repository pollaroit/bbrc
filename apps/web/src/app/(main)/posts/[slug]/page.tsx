import { contentPlainText } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blocks/post-detail";
import { loadPostBySlugForIsr } from "@/lib/isr-data";
import {
	blogPostingJsonLd,
	buildNotFoundMetadata,
	buildPageMetadata,
	JsonLd,
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
				<PostDetail post={post} />
			</>
		);
	} catch {
		notFound();
	}
}
