import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminSeriesTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSeriesStats } from "@/components/blocks/admin-series-stats";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Series admin — stats",
	description: "Charts for catalog series.",
	path: "/admin/series/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSeriesStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Series"
			description="Growth, size distribution, and how complete series are across the catalog."
			tabs={[...adminSeriesTabs]}
			activeHref="/admin/series/stats"
		>
			<AdminSeriesStats />
		</AdminResourceShell>
	);
}
