import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminQuizzesOverview } from "@/components/blocks/admin-quizzes-overview";
import {
	AdminResourceShell,
	adminQuizTabs,
} from "@/components/blocks/admin-resource-shell";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Quizzes admin — overview",
	description: "Quiz KPIs and rankings.",
	path: "/admin/quizzes",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminQuizzesOverviewPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Quizzes"
			description="Quiz health, attempts, reports and rankings. Use List to manage individual quizzes and Stats for charts."
			tabs={[...adminQuizTabs]}
			activeHref="/admin/quizzes"
		>
			<ListingSearchParamsBoundary>
				<Suspense fallback={null}>
					<AdminQuizzesOverview />
				</Suspense>
			</ListingSearchParamsBoundary>
		</AdminResourceShell>
	);
}
