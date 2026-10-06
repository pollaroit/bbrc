import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserFactReplaysGrid } from "@/components/blocks/user-fact-replays-grid";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/reels">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

		return buildPageMetadata({
			title: `${user.name} — fact replays`,
			description: `Revisit facts ${user.name} has seen on BBRC.`,
			path: `/users/${user.username}/reels`,
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserFactReplaysPage({
	params,
}: PageProps<"/users/[username]/reels">) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	const { username } = await params;

	const member = await db.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});

	if (!member) {
		redirect("/users" as Route);
	}

	if (session.user.username !== member.username) {
		redirect(`/users/${member.username}` as Route);
	}

	return (
		<div className="flex flex-col gap-2">
			<h2 className="font-semibold text-lg tracking-tight">Fact replays</h2>
			<UserFactReplaysGrid username={member.username} />
		</div>
	);
}
