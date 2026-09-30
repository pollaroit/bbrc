import type { Metadata } from "next";
import { SittingsList } from "@/components/blocks/sittings-list";
import { SittingsListingToolbar } from "@/components/blocks/sittings-listing-toolbar";
import { SittingsPageActions } from "@/components/blocks/sittings-page-actions";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Sittings",
	description: "Club reading sittings, polls, and participation.",
	path: "/sittings",
});

export const dynamic = "force-static";

export default function SittingsPage() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-bold text-2xl">Sittings</h1>
				<SittingsPageActions />
			</div>
			<ListingSearchParamsBoundary>
				<SittingsListingToolbar />
				<SittingsList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
