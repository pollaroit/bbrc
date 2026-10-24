import type { Metadata } from "next";
import { SittingInvitationsNotice } from "@/components/blocks/sitting-invitations-notice";
import { SittingsLibraryPageHeader } from "@/components/blocks/sittings-library-page-header";
import { SittingsList } from "@/components/blocks/sittings-list";
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
			<ListingSearchParamsBoundary>
				<SittingsLibraryPageHeader />
				<SittingInvitationsNotice />
				<SittingsList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
