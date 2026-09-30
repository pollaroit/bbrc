import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AddBookPageHeader } from "@/components/blocks/add-book-page-header";
import { AddNewBookForm } from "@/components/blocks/add-new-book-form";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Add book",
	description: "Add a book to the BBRC library from Open Library.",
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
			<AddNewBookForm />
		</div>
	);
}
