import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminShelfTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminShelvesStats } from "@/components/blocks/admin-shelves-stats";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelves admin — stats",
	description: "Charts and distributions for shelves.",
	path: "/admin/shelves/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminShelvesStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Shelves"
			description="Deeper charts: status, list types, growth, book counts, and engagement."
			tabs={[...adminShelfTabs]}
			activeHref="/admin/shelves/stats"
		>
			<AdminShelvesStats />
		</AdminResourceShell>
	);
}
