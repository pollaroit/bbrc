import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FactReelsViewer } from "@/components/blocks/fact-reels-viewer";
import { buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

type UserFactReplayViewerPageProps =
	PageProps<"/[locale]/users/[username]/reels/[factId]">;

export async function generateMetadata({
	params,
}: UserFactReplayViewerPageProps): Promise<Metadata> {
	const { username, factId } = await params;

	return buildPageMetadata({
		title: "Fact replay",
		description: `Replay a fact from @${username}.`,
		path: `/users/${username}/reels/${factId}`,
	});
}

export default async function UserFactReplayViewerPage({
	params,
}: UserFactReplayViewerPageProps) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	const { username, factId } = await params;

	const member = await db.user.findUnique({
		where: { username },
		select: { username: true },
	});

	if (!member) {
		notFound();
	}

	if (session.user.username !== member.username) {
		redirect(`/users/${member.username}` as Route);
	}

	return (
		<FactReelsViewer
			mode="history"
			username={member.username}
			viewerUsername={session.user.username}
			initialFactId={factId}
		/>
	);
}
