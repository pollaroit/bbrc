import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminFactsPanel } from "@/components/blocks/admin-facts-panel";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Facts admin",
	description: "Generate, review, and publish fact reels.",
	path: "/admin/facts",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminFactsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">Fact reels</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Generate drafts with Gemini, validate sources, and publish to the
					member reel feed.
				</p>
			</div>
			<AdminFactsPanel />
		</div>
	);
}
