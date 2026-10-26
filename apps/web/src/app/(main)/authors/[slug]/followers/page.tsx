import type { Metadata } from "next";
import { AuthorTabFollowers } from "@/components/blocks/author/author-tab-followers";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/followers">): Promise<Metadata> {
	const { slug } = await params;
	const head = await buildAuthorTabMetadata(slug, "followers");
	// Who follows someone is a members' list, not something for search results.
	return { ...head, robots: { index: false, follow: true } };
}

export default async function AuthorFollowersPage({
	params,
}: PageProps<"/authors/[slug]/followers">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "followers");

	return (
		<ListingSearchParamsBoundary>
			<AuthorTabFollowers slug={author.slug} authorName={author.name} />
		</ListingSearchParamsBoundary>
	);
}
