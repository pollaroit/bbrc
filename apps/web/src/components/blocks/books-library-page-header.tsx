"use client";

import { useTranslations } from "next-intl";
import { BooksListingToolbar } from "@/components/blocks/books-listing-toolbar";
import { LibraryBookActionLink } from "@/components/blocks/library-book-action-link";

export function BooksLibraryPageHeader() {
	const t = useTranslations("books");
	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{t("list.title")}
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{t("list.intro")}
					</p>
				</div>
				<LibraryBookActionLink appearance="library" />
			</div>
			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<BooksListingToolbar variant="library" appearance="library" />
			</div>
		</section>
	);
}
