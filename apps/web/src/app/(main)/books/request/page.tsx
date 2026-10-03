import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RequestBookForm } from "@/components/blocks/request-book-form";
import { RequestBookPageHeader } from "@/components/blocks/request-book-page-header";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

const REQUEST_BOOK_PAGE_DESCRIPTION =
	"Search Open Library and ask admins to add a title to the BBRC club library. Members can suggest works that are not in our catalog yet.";

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
			<RequestBookForm canRequest={canRequest} />
		</div>
	);
}
