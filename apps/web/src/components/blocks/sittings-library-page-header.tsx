import { SittingsListingToolbar } from "@/components/blocks/sittings-listing-toolbar";
import { SittingsPageActions } from "@/components/blocks/sittings-page-actions";

export function SittingsLibraryPageHeader() {
	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Sittings
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Every club reading, from the vote to the last page. Search, filter,
						and sort to see who is reading what and how far along everyone is.
					</p>
				</div>
				<SittingsPageActions />
			</div>
			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<SittingsListingToolbar />
			</div>
		</section>
	);
}
