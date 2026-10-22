import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminQuizzesTable } from "@/components/blocks/admin-quizzes-table";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Quizzes admin",
	description: "Review generated book quizzes and reported questions.",
	path: "/admin/quizzes",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminQuizzesPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">Quizzes</h1>
				<p className="max-w-3xl text-muted-foreground text-sm">
					Quizzes the AI wrote for books, who generated them and which questions
					readers reported. Delete or regenerate only works while nobody has an
					attempt on the quiz.
				</p>
			</div>
			<ListingSearchParamsBoundary>
				<AdminQuizzesTable />
			</ListingSearchParamsBoundary>
		</div>
	);
}
