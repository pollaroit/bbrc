import { getJoinState } from "@bbrc/api/modules/sitting/sitting-join.service";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SittingSettingsView } from "@/components/blocks/sitting-settings-view";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import { getRequestViewer } from "@/lib/request-viewer";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

/** Session-gated (`headers()`); do not ISR or prerender this segment. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]/settings">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		return {
			...buildPageMetadata({
				title: `Settings · ${sitting.displayName}`,
				description: "Organiser settings for this sitting.",
				path: `/sittings/${sitting.slug}/settings`,
			}),
			robots: { index: false, follow: false },
		};
	} catch {
		return buildNotFoundMetadata("Sitting");
	}
}

/** Only admins and the person who created the sitting can open this page. */
export default async function SittingSettingsPage({
	params,
}: PageProps<"/sittings/[slug]/settings">) {
	const { slug } = await params;
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/sign-in" as Route);
	}

	let canManage = false;
	try {
		canManage = (await getJoinState(db, slug, await getRequestViewer())).viewer
			.canManage;
	} catch {
		notFound();
	}
	if (!canManage) {
		redirect(`/sittings/${slug}` as Route);
	}

	const sitting = await loadSittingBySlugForIsr(slug);

	return (
		<ListingSearchParamsBoundary>
			<SittingSettingsView
				sitting={sitting}
				isAdmin={session.user.isAdmin === true}
			/>
		</ListingSearchParamsBoundary>
	);
}
