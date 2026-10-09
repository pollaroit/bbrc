import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminFactsInventory } from "@/components/blocks/admin-facts-inventory";
import {
	AdminResourceShell,
	adminFactTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Facts admin — inventory",
	description: "Browse, filter, and manage published and draft facts.",
	path: "/admin/facts/inventory",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminFactsInventoryPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Fact reels"
			description="Search the fact inventory, review engagement, and publish or delete entries."
			tabs={[...adminFactTabs]}
			activeHref="/admin/facts/inventory"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminFactsInventory />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
