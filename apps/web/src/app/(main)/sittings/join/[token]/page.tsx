import type { Metadata } from "next";
import { headers } from "next/headers";
import { SittingInviteSignIn } from "@/components/blocks/sitting-invite-sign-in";
import { SittingJoinPage } from "@/components/blocks/sitting-join-page";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

/**
 * The text is the same for every token, and the preview image only shows
 * details for a working link (see `resolveSittingInviteOg`), so a shared link
 * never reveals whether a token exists.
 */
export async function generateMetadata({
	params,
}: PageProps<"/sittings/join/[token]">): Promise<Metadata> {
	const { token } = await params;
	return buildPageMetadata({
		title: "You are invited to a BBRC sitting",
		description:
			"Join a BBRC reading sitting: read the same book as the club and share your progress.",
		path: `/sittings/join/${token}`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function SittingJoinRoute({
	params,
}: PageProps<"/sittings/join/[token]">) {
	const { token } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	// Signed-out visitors get a sign-in page (not a redirect), so link-preview
	// crawlers receive this page's metadata; sign-in returns here afterwards.
	if (!session?.user) {
		return <SittingInviteSignIn token={token} />;
	}

	return <SittingJoinPage token={token} />;
}
