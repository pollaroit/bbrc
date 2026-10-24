import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SittingJoinPage } from "@/components/blocks/sitting-join-page";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Join a sitting",
	description: "Join a BBRC reading sitting with an invitation link.",
	path: "/sittings/join",
	robots: NO_INDEX_ROBOTS,
});

export default async function SittingJoinRoute({
	params,
}: PageProps<"/sittings/join/[token]">) {
	const { token } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	// Sign in (or sign up) first, then come straight back to this page.
	if (!session?.user) {
		redirect(authPageHref("/sign-in", `/sittings/join/${token}`) as Route);
	}

	return <SittingJoinPage token={token} />;
}
