import type { Metadata } from "next";
import { AuthorTabFavorites } from "@/components/blocks/author/author-tab-favorites";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/favorites">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "favorites");
}

export default async function AuthorFavoritesPage({
	params,
}: PageProps<"/authors/[slug]/favorites">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "favorites");

	return <AuthorTabFavorites slug={author.slug} authorName={author.name} />;
}
