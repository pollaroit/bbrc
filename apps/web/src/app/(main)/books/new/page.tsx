import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AddBookPageHeader } from "@/components/blocks/add-book-page-header";
import { AddBookFlow } from "@/components/blocks/book-flow/add-book-flow";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Add book",
	description:
		"Find a book on Open Library, check the details and add it to the BBRC library.",
	robots: NO_INDEX_ROBOTS,
	path: "/books/new",
});

export default async function AddNewBookPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/books" as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<AddBookPageHeader />
			<ListingSearchParamsBoundary>
				<AddBookFlow />
			</ListingSearchParamsBoundary>
		</div>
	);
}
