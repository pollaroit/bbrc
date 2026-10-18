import type { Metadata } from "next";
import { BooksLibraryPageHeader } from "@/components/blocks/books-library-page-header";
import { BooksList } from "@/components/blocks/books-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

const booksPageMetadata = buildPageMetadata({
	title: "Books",
	description: "Browse the BBRC library and club reading list.",
	path: "/books",
});

export const metadata: Metadata = {
	...booksPageMetadata,
	alternates: {
		...booksPageMetadata.alternates,
		types: {
			"application/rss+xml": "/feed/books",
		},
	},
};

export const dynamic = "force-static";

export default function BooksPage() {
	return (
		<div className="flex flex-col gap-8">
			<ListingSearchParamsBoundary>
				<div className="flex flex-col gap-8">
					<BooksLibraryPageHeader />
					<BooksList />
				</div>
			</ListingSearchParamsBoundary>
		</div>
	);
}
