import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminCommentsStats } from "@/components/blocks/admin-comments-stats";
import {
	AdminResourceShell,
	adminCommentTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Comments admin — stats",
	description: "Charts and distributions for comments.",
	path: "/admin/comments/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminCommentsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Comments"
			description="Deeper charts: growth, context mix, depth, likes, and engagement."
			tabs={[...adminCommentTabs]}
			activeHref="/admin/comments/stats"
		>
			<AdminCommentsStats />
		</AdminResourceShell>
	);
}
