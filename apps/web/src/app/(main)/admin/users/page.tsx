import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminMemberTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminUsersOverview } from "@/components/blocks/admin-users-overview";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin — overview",
	description: "Membership KPIs and club activity totals.",
	path: "/admin/users",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminUsersOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Members"
			description="Membership KPIs, growth chart, and top-5 rankings. Use List for the directory and Stats for charts."
			tabs={[...adminMemberTabs]}
			activeHref="/admin/users"
		>
			<AdminUsersOverview />
		</AdminResourceShell>
	);
}
