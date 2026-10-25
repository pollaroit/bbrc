import type { Metadata } from "next";
import { AuthorTabComments } from "@/components/blocks/author/author-tab-comments";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/comments">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "comments");
}

export default async function AuthorCommentsPage({
	params,
}: PageProps<"/authors/[slug]/comments">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "comments");

	return <AuthorTabComments slug={author.slug} authorName={author.name} />;
}
