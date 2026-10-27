import { toLocale } from "@bbrc/i18n";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShelfInvitationPage } from "@/components/blocks/shelf-invitation-page";
import { authPageHref } from "@/lib/auth-callback-url";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Shelf invitation",
	description: "Accept or decline an invitation to collaborate on a shelf.",
	path: "/shelf-invitations",
	robots: NO_INDEX_ROBOTS,
});

export default async function ShelfInvitationRoute({
	params,
}: PageProps<"/[locale]/shelf-invitations/[token]">) {
	const { token, locale } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	// Sign in first, then come straight back to the invitation.
	if (!session?.user) {
		redirect(
			authPageHref(
				"/sign-in",
				`/shelf-invitations/${token}`,
				toLocale(locale),
			) as Route,
		);
	}

	return <ShelfInvitationPage token={token} />;
}
