import { getSittingBySlug } from "@bbrc/api/modules/sitting/sitting.service";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SittingParticipantsView } from "@/components/blocks/sitting-participants-view";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { auth, db } from "@/services";

/** Session-gated (`headers()`); do not ISR or prerender this segment. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/sittings/[slug]/participants">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		return buildPageMetadata({
			title: `Participants · ${sitting.displayName}`,
			description: `${sitting.participants.length} members on this BBRC sitting · status ${sitting.status}.`,
			path: `/sittings/${sitting.slug}/participants`,
		});
	} catch {
		return buildNotFoundMetadata("Sitting");
	}
}

export default async function SittingParticipantsPage({
	params,
}: PageProps<"/[locale]/sittings/[slug]/participants">) {
	const { slug } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/sign-in" as Route);
	}

	let sitting: Awaited<ReturnType<typeof getSittingBySlug>>;
	try {
		sitting = await getSittingBySlug(slug, db, session);
	} catch {
		notFound();
	}

	return (
		<ListingSearchParamsBoundary>
			<SittingParticipantsView
				sitting={sitting}
				isAdmin={session.user.isAdmin === true}
				viewerUserId={session.user.id}
			/>
		</ListingSearchParamsBoundary>
	);
}
