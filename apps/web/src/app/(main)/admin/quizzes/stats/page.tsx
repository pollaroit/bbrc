import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminQuizzesStats } from "@/components/blocks/admin-quizzes-stats";
import {
	AdminResourceShell,
	adminQuizTabs,
} from "@/components/blocks/admin-resource-shell";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Quizzes admin — stats",
	description: "Quiz charts: generation, attempts, scores and difficulty.",
	path: "/admin/quizzes/stats",
	robots: NO_INDEX_ROBOTS,
});

export default async function AdminQuizzesStatsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<AdminResourceShell
			title="Quizzes"
			description="Deeper charts: generation outcomes, attempts, scores, question difficulty and engagement."
			tabs={[...adminQuizTabs]}
			activeHref="/admin/quizzes/stats"
		>
			<AdminQuizzesStats />
		</AdminResourceShell>
	);
}
