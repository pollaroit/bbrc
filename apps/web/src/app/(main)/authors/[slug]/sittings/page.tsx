import type { Metadata } from "next";
import { AuthorTabSittings } from "@/components/blocks/author/author-tab-sittings";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/sittings">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "sittings");
}

export default async function AuthorSittingsPage({
	params,
}: PageProps<"/authors/[slug]/sittings">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "sittings");

	return (
		<ListingSearchParamsBoundary>
			<AuthorTabSittings slug={author.slug} authorName={author.name} />
		</ListingSearchParamsBoundary>
	);
}
