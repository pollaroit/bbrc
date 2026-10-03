import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CreateShelfForm } from "@/components/blocks/create-shelf-form";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth } from "@/services";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/shelves/new">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

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

	return (
		<div className="flex flex-col gap-8">
			<header className="space-y-1.5 border-border border-b pb-6">
				<h1 className="font-bold text-2xl tracking-tight">New shelf</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Group books into a list you can keep private or share on your profile.
				</p>
			</header>
			<CreateShelfForm username={username} />
		</div>
	);
}
