import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	AdminResourceShell,
	adminAuthorTabs,
} from "@/components/blocks/admin-resource-shell";
import { AdminAuthorsReview } from "@/components/blocks/author/admin/admin-authors-review";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Authors admin — needs review",
	description: "Review queue for authors.",
	path: "/admin/authors/review",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuthorsReviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Authors"
			description="Confirm details, merge look-alikes, and fix what the lookup was unsure about."
			tabs={[...adminAuthorTabs]}
			activeHref="/admin/authors/review"
		>
			<AdminAuthorsReview />
		</AdminResourceShell>
	);
}
