import type { Metadata } from "next";
import { AuthorTabShelves } from "@/components/blocks/author/author-tab-shelves";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/shelves">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "shelves");
}

export default async function AuthorShelvesPage({
	params,
}: PageProps<"/authors/[slug]/shelves">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "shelves");

	return (
		<ListingSearchParamsBoundary>
			<AuthorTabShelves slug={author.slug} authorName={author.name} />
		</ListingSearchParamsBoundary>
	);
}
