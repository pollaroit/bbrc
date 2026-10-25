import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestFlow } from "@/components/blocks/book-flow/request-flow";
import { RequestBookPageHeader } from "@/components/blocks/request-book-page-header";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

const REQUEST_BOOK_PAGE_DESCRIPTION =
	"Find a title on Open Library and ask admins to add it to the BBRC club library. See what other members want and say me too.";

export const metadata: Metadata = buildPageMetadata({
	title: "Request a book",
	description: REQUEST_BOOK_PAGE_DESCRIPTION,
	path: "/books/request",
});

export default async function RequestBookPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	const canRequest = !session.user.isAdmin;

	return (
		<div className="flex flex-col gap-8">
			<RequestBookPageHeader />
			{canRequest ? (
				<ListingSearchParamsBoundary>
					<RequestFlow />
				</ListingSearchParamsBoundary>
			) : (
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					As an admin you add books directly from{" "}
					<Link
						href={"/books/new" as Route}
						className="text-foreground underline"
					>
						Add a book
					</Link>
					. Members use this page to request titles for the library.
				</p>
			)}
		</div>
	);
}
