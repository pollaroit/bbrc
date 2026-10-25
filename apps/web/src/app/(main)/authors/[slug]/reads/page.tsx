import type { Metadata } from "next";
import { AuthorTabReads } from "@/components/blocks/author/author-tab-reads";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/reads">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "reads");
}

export default async function AuthorReadsPage({
	params,
}: PageProps<"/authors/[slug]/reads">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "reads");

	return <AuthorTabReads slug={author.slug} authorName={author.name} />;
}
