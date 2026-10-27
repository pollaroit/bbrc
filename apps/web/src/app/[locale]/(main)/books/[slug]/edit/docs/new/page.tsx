import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { listApprovedDocumentsByBook } from "@bbrc/api/modules/document/document.service";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateDocumentForm } from "@/components/blocks/create-document-form";
import { Link } from "@/i18n/navigation";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]/edit/docs/new">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildPageMetadata({
			title: `Add document · ${book.title}`,
			description: `Submit a PDF for ${book.title} in the BBRC library.`,
			path: `/books/${slug}/edit/docs/new`,
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function NewBookDocumentPage({
	params,
}: PageProps<"/[locale]/books/[slug]/edit/docs/new">) {
	const { slug } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	if (session.user.status === "banned") {
		redirect(`/books/${slug}` as Route);
	}

	let book: TGetBookBySlugOutputSchema;
	try {
		book = await loadBookBySlugForIsr(slug);
	} catch {
		redirect("/books" as Route);
	}

	const { items } = await listApprovedDocumentsByBook(slug, db);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
			<Link
				href={`/books/${slug}` as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				{book.title}
			</Link>

			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">Add document</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Share a PDF with the club for{" "}
					<span className="text-foreground">{book.title}</span>.
					{session.user.isAdmin
						? " Your upload goes live on the book page right away."
						: " An admin will review it before it appears on the book page."}
				</p>
			</div>

			<CreateDocumentForm
				bookSlug={slug}
				bookTitle={book.title}
				approvedDocumentCount={items.length}
				isAdmin={session.user.isAdmin}
			/>
		</div>
	);
}
