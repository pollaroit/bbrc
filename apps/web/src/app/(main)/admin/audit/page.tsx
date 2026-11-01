import { isSuperAdmin } from "@bbrc/shared";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminResourceShell } from "@/components/blocks/admin-resource-shell";
import { AuditLogList } from "@/components/blocks/audit/audit-log-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Audit log",
	description: "What staff changed, and when.",
	path: "/admin/audit",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminAuditPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!isSuperAdmin(session?.user)) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Audit log"
			description="Every change staff make to members, books, authors, sittings and more. Entries are never edited or removed."
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AuditLogList />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
