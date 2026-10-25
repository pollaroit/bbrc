import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminAuthorTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminAuthorsStats } from "@/components/blocks/author/admin/admin-authors-stats";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors admin — stats",
	description: "Charts for authors.",
	path: "/admin/authors/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuthorsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Authors"
			description="How complete the author records are, and who the club reads."
			tabs={[...adminAuthorTabs]}
			activeHref="/admin/authors/stats"
		>
			<AdminAuthorsStats />
		</AdminResourceShell>
	);
}
