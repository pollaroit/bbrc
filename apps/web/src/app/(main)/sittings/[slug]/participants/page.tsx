import { getSittingBySlug } from "@bbrc/api/modules/sitting/sitting.service";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SittingParticipantsPageContent } from "@/components/blocks/sitting-participants-page-content";
import { SittingParticipantsPageIntro } from "@/components/blocks/sitting-participants-page-intro";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	sittingSlugStaticParams,
} from "@/lib/seo";
import { auth, db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return sittingSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]/participants">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		return buildPageMetadata({
			title: `Participants · ${sitting.slug.replaceAll("_", " ")}`,
			description: `${sitting.participants.length} members on this BBRC sitting · status ${sitting.status}.`,
			path: `/sittings/${sitting.slug}/participants`,
		});
	} catch {
		return buildNotFoundMetadata("Sitting");
	}
}

export default async function SittingParticipantsPage({
	params,
}: PageProps<"/sittings/[slug]/participants">) {
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

	const isParticipant = sitting.participants.some(
		(participant) => participant.userId === session.user.id,
	);
	const isAdmin = session.user.isAdmin;

	if (!isParticipant && !isAdmin) {
		redirect(`/sittings/${sitting.slug}` as Route);
	}

	return (
		<div className="flex flex-col gap-6">
			<SittingParticipantsPageIntro sitting={sitting} />
			<SittingParticipantsPageContent sitting={sitting} isAdmin={isAdmin} />
		</div>
	);
}
