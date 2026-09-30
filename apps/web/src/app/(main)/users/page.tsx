import type { Metadata } from "next";
import { MembersListingToolbar } from "@/components/blocks/members-listing-toolbar";
import { UsersList } from "@/components/blocks/users-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Members",
	description: "View all members of the Brigada Book Reading Club.",
	path: "/users",
});

export const dynamic = "force-static";

export default function UsersPage() {
	return (
		<div className="flex flex-col gap-6">
			<h1 className="font-bold text-2xl">Members</h1>
			<ListingSearchParamsBoundary>
				<MembersListingToolbar />
				<UsersList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
