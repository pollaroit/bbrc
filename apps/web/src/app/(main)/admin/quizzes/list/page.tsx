import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminQuizzesTable } from "@/components/blocks/admin-quizzes-table";
import {
	AdminResourceShell,
	adminQuizTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Quizzes admin — list",
	description: "Search, filter and manage book quizzes.",
	path: "/admin/quizzes/list",
	robots: NO_INDEX_ROBOTS,
});

function Fallback() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-full max-w-xl" />
			<Skeleton className="h-120 w-full" />
		</div>
	);
}

export default async function AdminQuizzesListPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Quizzes"
			description="Every generated quiz with attempts, scores and reports. Delete or regenerate while nobody has an attempt."
			tabs={[...adminQuizTabs]}
			activeHref="/admin/quizzes/list"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={<Fallback />}>
					<AdminQuizzesTable />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
