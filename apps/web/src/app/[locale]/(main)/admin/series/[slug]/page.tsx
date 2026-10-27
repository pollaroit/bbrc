import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSeriesEditor } from "@/components/blocks/admin-series-editor";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Edit series",
	description: "Edit series metadata and book order.",
	path: "/admin/series",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSeriesEditPage({
	params,
}: PageProps<"/[locale]/admin/series/[slug]">) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	const { slug } = await params;

	return <AdminSeriesEditor seriesSlug={slug} />;
}
