import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDocumentsStats } from "@/components/blocks/admin-documents-stats";
import {
	AdminResourceShell,
	adminDocumentTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Documents admin — stats",
	description: "Charts and distributions for documents.",
	path: "/admin/documents/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminDocumentsStatsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Documents"
			description="Deeper charts: growth, status, languages, and review funnel."
			tabs={[...adminDocumentTabs]}
			activeHref="/admin/documents/stats"
		>
			<AdminDocumentsStats />
		</AdminResourceShell>
	);
}
