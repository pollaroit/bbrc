import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminUsersStats } from "@/components/blocks/admin-users-stats";
import { AdminUsersTable } from "@/components/blocks/admin-users-table";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Members admin",
	description: "Manage club members, roles, and status.",
	path: "/admin/users",
});

function AdminUsersTableFallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-[480px] w-full" />
		</div>
	);
}

export default async function AdminUsersPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<div className="flex flex-col gap-10">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">Members</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Overview of club membership, engagement, and admin actions. Status
					changes and password resets are handled here only.
				</p>
			</div>

			<AdminUsersStats />

			<section aria-labelledby="admin-users-table-heading">
				<h2 id="admin-users-table-heading" className="sr-only">
					Member directory
				</h2>
				<Suspense fallback={<AdminUsersTableFallback />}>
					<AdminUsersTable />
				</Suspense>
			</section>
		</div>
	);
}
