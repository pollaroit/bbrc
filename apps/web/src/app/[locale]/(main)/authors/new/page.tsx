import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/blocks/admin-app-shell";
import { AuthorCreateForm } from "@/components/blocks/author/admin/author-create-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Add an author",
	description: "Add an author to the library.",
	path: "/authors/new",
	robots: NO_INDEX_ROBOTS,
});

export const dynamic = "force-dynamic";

export default async function NewAuthorPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect("/authors" as Route);
	}

	return (
		<AdminAppShell>
			<AuthorCreateForm />
		</AdminAppShell>
	);
}
