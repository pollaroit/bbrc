import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPostsOverview } from "@/components/blocks/admin-posts-overview";
import {
	AdminResourceShell,
	adminPostTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Posts admin — overview",
	description: "Post KPIs and rankings.",
	path: "/admin/posts",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminPostsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Posts"
			description="View feed health, rankings, and quick links. Use List for the full directory and Stats for charts."
			tabs={[...adminPostTabs]}
			activeHref="/admin/posts"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminPostsOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
