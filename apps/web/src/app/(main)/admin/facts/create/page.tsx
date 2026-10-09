import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminFactsPanel } from "@/components/blocks/admin-facts-panel";
import {
	AdminResourceShell,
	adminFactTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Facts admin — create",
	description: "Generate and publish fact reel drafts.",
	path: "/admin/facts/create",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminFactsCreatePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Fact reels"
			description="Generate drafts with Gemini, validate sources, and publish to the member reel feed."
			tabs={[...adminFactTabs]}
			activeHref="/admin/facts/create"
		>
			<AdminFactsPanel />
		</AdminResourceShell>
	);
}
