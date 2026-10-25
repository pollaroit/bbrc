import type { Metadata } from "next";
import { AuthorTabPosts } from "@/components/blocks/author/author-tab-posts";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/posts">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "posts");
}

export default async function AuthorPostsPage({
	params,
}: PageProps<"/authors/[slug]/posts">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "posts");

	return <AuthorTabPosts slug={author.slug} authorName={author.name} />;
}
