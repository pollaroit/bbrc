import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminMemberTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminUsersStats } from "@/components/blocks/admin-users-stats";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin — stats",
	description: "Signup trends and engagement breakdown.",
	path: "/admin/users/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminUsersStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Members"
			description="Charts and activity breakdown for membership."
			tabs={[...adminMemberTabs]}
			activeHref="/admin/users/stats"
		>
			<AdminUsersStats />
		</AdminResourceShell>
	);
}
