import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateShelfForm } from "@/components/blocks/create-shelf-form";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/new">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `New shelf · ${user.name}`,
			description: "Create a personal reading list.",
			path: `/users/${user.username}/shelves/new`,
			openGraph: { type: "profile" },
			robots: { index: false, follow: false },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function NewShelfPage({
	params,
}: PageProps<"/users/[username]/shelves/new">) {
	const { username } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user || session.user.username !== username) {
		redirect(`/users/${username}/shelves` as Route);
	}

	return <CreateShelfForm username={username} />;
}
