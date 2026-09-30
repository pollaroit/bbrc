import type { Metadata } from "next";
import { AddBookLink } from "@/components/blocks/add-book-link";
import { BooksList } from "@/components/blocks/books-list";
import { BooksListingToolbar } from "@/components/blocks/books-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";

export const metadata: Metadata = {
	title: "Books",
	description: "Browse the BBRC library.",
};

export default function BooksPage() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-bold text-2xl">Books</h1>
				<AddBookLink />
			</div>
			<ListingSearchParamsBoundary>
				<BooksListingToolbar />
				<BooksList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
