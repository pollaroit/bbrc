import type { Metadata } from "next";
import { MembersListingToolbar } from "@/components/blocks/members-listing-toolbar";
import { UsersList } from "@/components/blocks/users-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";

export const metadata: Metadata = {
	title: "Members",
	description: "View all members of the BBRC.",
};

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
