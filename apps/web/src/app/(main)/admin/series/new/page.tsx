import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSeriesCreateForm } from "@/components/blocks/admin-series-create-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "New series",
	description: "Create a catalog series.",
	path: "/admin/series/new",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminSeriesNewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return <AdminSeriesCreateForm />;
}
