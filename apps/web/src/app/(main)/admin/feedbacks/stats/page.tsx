import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminFeedbacksStats } from "@/components/blocks/admin-feedbacks-stats";
import {
	AdminResourceShell,
	adminFeedbackTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Feedbacks admin — stats",
	description: "Charts and distributions for feedbacks.",
	path: "/admin/feedbacks/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminFeedbacksStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Feedbacks"
			description="Deeper charts: ratings, growth, review length, engagement, and book status."
			tabs={[...adminFeedbackTabs]}
			activeHref="/admin/feedbacks/stats"
		>
			<AdminFeedbacksStats />
		</AdminResourceShell>
	);
}
