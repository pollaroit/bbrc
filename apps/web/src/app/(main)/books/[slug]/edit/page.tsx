import { canManageBooks } from "@bbrc/shared";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EditBookForm } from "@/components/blocks/edit-book-form";
import { EditBookPageHeader } from "@/components/blocks/edit-book-page-header";
import { loadBookBySlugForIsr as loadBookBySlug } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]/edit">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlug(slug);

		return buildPageMetadata({
			title: `Edit ${book.title}`,
			description: `Edit library metadata for ${book.title}.`,
			path: `/books/${book.slug}/edit`,
			robots: NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function EditBookPage({
	params,
}: PageProps<"/books/[slug]/edit">) {
	const { slug } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!canManageBooks(session?.user)) {
		redirect(`/books/${slug}` as Route);
	}

	const book = await loadBookBySlug(slug);

	return (
		<div className="flex flex-col gap-8">
			<EditBookPageHeader book={book} />
			<EditBookForm book={book} />
		</div>
	);
}
