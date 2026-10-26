import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
	AdminResourceShell,
	adminMemberTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminCompareStats } from "@/components/blocks/admin-user-compare/admin-compare-stats";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin — compare stats",
	description: "How alike the club reads.",
	path: "/admin/users/compare/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminUsersCompareStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Members"
			description="How alike the club reads: closest pairs, most unusual readers and who reads with whom."
			tabs={[...adminMemberTabs]}
			activeHref="/admin/users/compare/stats"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminCompareStats />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
