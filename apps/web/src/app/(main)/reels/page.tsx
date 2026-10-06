import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FactReelsViewer } from "@/components/blocks/fact-reels-viewer";
import { buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Fact reels",
	description:
		"Swipe through club facts — history, science, literature, and more.",
	path: "/reels",
});

type ReelsPageProps = {
	searchParams: Promise<{ fact?: string }>;
};

export default async function ReelsPage({ searchParams }: ReelsPageProps) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	const { fact: initialFactId } = await searchParams;

	return <FactReelsViewer initialFactId={initialFactId} />;
}
