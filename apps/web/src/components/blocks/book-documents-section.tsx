"use client";

import type { ListApprovedDocumentsByBookOutput } from "@bbrc/api/modules/document/document.schema";
import { documentLanguageLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { FileText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { authClient } from "@/lib/auth-client";

type BookDocumentsSectionProps = {
	bookSlug: string;
	bookTitle: string;
	documents: ListApprovedDocumentsByBookOutput["items"];
};

export function BookDocumentsSection({
	bookSlug,
	bookTitle,
	documents,
}: BookDocumentsSectionProps) {
	const { data: session } = authClient.useSession();
	const newDocHref = `/books/${bookSlug}/edit/docs/new` as Route;

	return (
		<section aria-labelledby="book-documents-heading" className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="book-documents-heading" className="font-semibold text-lg">
					Documents
				</h2>
				{session?.user ? (
					<Button
						render={<Link href={newDocHref} />}
						nativeButton={false}
						size="sm"
						variant="outline"
					>
						Add document
					</Button>
				) : null}
			</div>

			{documents.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
					No approved PDFs for {bookTitle} yet.
					{session?.user ? (
						<>
							{" "}
							<Link
								href={newDocHref}
								className="text-foreground underline-offset-2 hover:underline"
							>
								Submit one for review
							</Link>
							.
						</>
					) : null}
				</p>
			) : (
				<ul className="divide-y divide-border border border-border">
					{documents.map((doc) => (
						<li
							key={doc.slug}
							className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0 space-y-1">
								<p className="flex items-center gap-2 font-medium text-sm">
									<FileText
										className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
										aria-hidden
									/>
									<span className="truncate">{doc.name}</span>
								</p>
								<p className="text-muted-foreground text-xs">
									{documentLanguageLabel(doc.language)} ·{" "}
									<Link
										href={`/users/${doc.uploader.username}` as Route}
										className="text-foreground underline-offset-2 hover:underline"
									>
										{doc.uploader.name}
									</Link>{" "}
									· <RelativeTime date={doc.createdAt} />
								</p>
							</div>
							<Button
								render={
									<a
										href={doc.documentUrl}
										target="_blank"
										rel="noopener noreferrer"
									/>
								}
								nativeButton={false}
								size="sm"
								variant="outline"
								className="w-fit shrink-0"
							>
								Download PDF
							</Button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
