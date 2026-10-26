import type { Metadata } from "next";
import { AuthorsListGrid } from "@/components/blocks/author/authors-list-grid";
import { AuthorsListHeader } from "@/components/blocks/author/authors-list-header";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors",
	description:
		"Browse the writers behind the club's books by name, nationality and club stats.",
	path: "/authors",
});

export const dynamic = "force-dynamic";

export default function AuthorsPage() {
	return (
		<div className="flex flex-col gap-8">
			<ListingSearchParamsBoundary>
				<div className="flex flex-col gap-8">
					<AuthorsListHeader />
					<AuthorsListGrid />
				</div>
			</ListingSearchParamsBoundary>
		</div>
	);
}
