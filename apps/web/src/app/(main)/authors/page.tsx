import type { Metadata } from "next";
import { AuthorsLibraryPageHeader } from "@/components/blocks/authors-library-page-header";
import { AuthorsList } from "@/components/blocks/authors-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors",
	description:
		"Browse writers in the BBRC catalog by name, country, and club stats.",
	path: "/authors",
});

export const dynamic = "force-dynamic";

export default function AuthorsPage() {
	return (
		<div className="flex flex-col gap-8">
			<ListingSearchParamsBoundary>
				<div className="flex flex-col gap-8">
					<AuthorsLibraryPageHeader />
					<AuthorsList />
				</div>
			</ListingSearchParamsBoundary>
		</div>
	);
}
