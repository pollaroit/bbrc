import type { GetDocumentForEditOutput } from "@bbrc/api/modules/document/document.schema";
import { getDocumentForEdit } from "@bbrc/api/modules/document/document.service";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EditDocumentForm } from "@/components/blocks/edit-document-form";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]/edit/docs/[documentSlug]/edit">): Promise<Metadata> {
	const { slug, documentSlug } = await params;
	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildPageMetadata({
			title: `Edit document · ${book.title}`,
			path: `/books/${slug}/edit/docs/${documentSlug}/edit`,
		});
	} catch {
		return buildNotFoundMetadata("Document");
	}
}

export default async function EditBookDocumentPage({
	params,
}: PageProps<"/[locale]/books/[slug]/edit/docs/[documentSlug]/edit">) {
	const { slug, documentSlug } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	if (session.user.status === "banned") {
		redirect(`/books/${slug}` as Route);
	}

	let document: GetDocumentForEditOutput;
	try {
		document = await getDocumentForEdit(slug, documentSlug, session, db);
	} catch {
		redirect(`/books/${slug}` as Route);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
			<Link
				href={`/books/${slug}` as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to book
			</Link>

			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">Edit document</h1>
				<p className="text-muted-foreground text-sm">{document.name}</p>
			</div>

			<EditDocumentForm document={document} />
		</div>
	);
}
