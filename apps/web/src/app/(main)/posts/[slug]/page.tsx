import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PostDetail } from "@/components/blocks/post-detail";
import { orpc } from "@/utils/orpc";

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

		return {
			title: `Post by ${post.author.name}`,
			description: excerpt || "BBRC club post.",
		};
	} catch {
		return {
			title: "Post not found",
			description: "This post could not be found.",
		};
	}
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
	const { slug } = await params;

	try {
		const post = await loadPostBySlug(slug);
		return <PostDetail post={post} />;
	} catch {
		notFound();
	}
}
