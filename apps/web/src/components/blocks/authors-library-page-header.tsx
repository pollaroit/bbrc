"use client";

import { AuthorsListingToolbar } from "@/components/blocks/authors-listing-toolbar";

export function AuthorsLibraryPageHeader() {
	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Authors
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Every writer in the club catalog, derived from book metadata.
						Search, filter, and open a profile to browse their titles.
					</p>
				</div>
			</div>
			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<AuthorsListingToolbar />
			</div>
		</section>
	);
}
