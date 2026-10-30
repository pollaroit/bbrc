import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FriendsPage } from "@/components/blocks/friends-page";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
	title: "Friends",
	description: "Your friends, friend requests and blocked members.",
	path: "/friends",
	robots: NO_INDEX_ROBOTS,
});

export default async function FriendsRoute() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect(authPageHref("/sign-in", "/friends") as Route);
	}
	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Friends</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Friends see each other's friends-only posts and shelves. Both of you
					have to agree.
				</p>
			</div>
			<FriendsPage />
		</div>
	);
}
