import type { Metadata } from "next";
import { BooksList } from "@/components/blocks/books-list";
import { BooksListingToolbar } from "@/components/blocks/books-listing-toolbar";
import { LibraryBookActionLink } from "@/components/blocks/library-book-action-link";
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
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Books
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Club catalog with reading status on every title. Filter, sort, and
						open a book for reviews, shelves, and documents.
					</p>
				</div>
				<LibraryBookActionLink />
			</div>
			<ListingSearchParamsBoundary>
				<div className="flex flex-col gap-6">
					<div className="border border-border bg-muted/15 p-4">
						<BooksListingToolbar />
					</div>
					<BooksList />
				</div>
			</ListingSearchParamsBoundary>
		</div>
	);
}
