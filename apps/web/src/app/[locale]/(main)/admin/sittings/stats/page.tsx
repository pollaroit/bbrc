import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminSittingTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminSittingsStats } from "@/components/blocks/admin-sittings-stats";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Sittings admin — stats",
	description: "Charts and distributions for sittings.",
	path: "/admin/sittings/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSittingsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Sittings"
			description="Deeper charts: status, growth, participation, polls, and engagement."
			tabs={[...adminSittingTabs]}
			activeHref="/admin/sittings/stats"
		>
			<AdminSittingsStats />
		</AdminResourceShell>
	);
}
