import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PostDetail } from "@/components/blocks/post-detail";
import {
	blogPostingJsonLd,
	buildNotFoundMetadata,
	buildPageMetadata,
	DETAIL_PAGE_REVALIDATE_SECONDS,
	JsonLd,
	postSlugStaticParams,
} from "@/lib/seo";
import { db } from "@/services";
import { orpc } from "@/utils/orpc";

export const revalidate = DETAIL_PAGE_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
	return postSlugStaticParams(db);
}

const loadPostBySlug = cache((slug: string) =>
	orpc.post.getPostBySlug.call(slug),
);

export async function generateMetadata({
	params,
}: PageProps<"/posts/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const post = await loadPostBySlug(slug);
		const excerpt = post.content.trim().slice(0, 160);

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
		const post = await loadPostBySlug(slug);

		return (
			<>
				<JsonLd
					data={blogPostingJsonLd({
						slug: post.slug,
						content: post.content,
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
