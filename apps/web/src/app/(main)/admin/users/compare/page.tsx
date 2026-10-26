import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminMemberTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminComparePage } from "@/components/blocks/admin-user-compare/admin-compare-page";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin — compare",
	description: "Compare the reading of any two members.",
	path: "/admin/users/compare",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminUsersComparePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Members"
			description="Compare the reading of any two members. Admins can open anyone, even members who turned comparisons off."
			tabs={[...adminMemberTabs]}
			activeHref="/admin/users/compare"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminComparePage />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
