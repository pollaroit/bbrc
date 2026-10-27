import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPostsStats } from "@/components/blocks/admin-posts-stats";
import {
	AdminResourceShell,
	adminPostTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Posts admin — stats",
	description: "Charts and distributions for posts.",
	path: "/admin/posts/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminPostsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Posts"
			description="Deeper charts: growth, attachments, content length, likes, and engagement."
			tabs={[...adminPostTabs]}
			activeHref="/admin/posts/stats"
		>
			<AdminPostsStats />
		</AdminResourceShell>
	);
}
