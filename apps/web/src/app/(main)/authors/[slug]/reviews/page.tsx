import type { Metadata } from "next";
import { AuthorTabReviews } from "@/components/blocks/author/author-tab-reviews";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildAuthorTabMetadata, requireAuthorTab } from "@/lib/author-tab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/reviews">): Promise<Metadata> {
	const { slug } = await params;
	return buildAuthorTabMetadata(slug, "reviews");
}

export default async function AuthorReviewsPage({
	params,
}: PageProps<"/authors/[slug]/reviews">) {
	const { slug } = await params;
	const author = await requireAuthorTab(slug, "reviews");

	return (
		<ListingSearchParamsBoundary>
			<AuthorTabReviews slug={author.slug} authorName={author.name} />
		</ListingSearchParamsBoundary>
	);
}
