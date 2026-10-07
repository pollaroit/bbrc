import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SittingPollSection } from "@/components/blocks/sitting-poll-section";
import { SittingVotePageIntro } from "@/components/blocks/sitting-vote-page-intro";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	sittingSlugStaticParams,
} from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return sittingSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]/vote">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		if (!sitting.poll) {
			return buildNotFoundMetadata("Poll");
		}

		const pollVotes =
			sitting.poll.options.reduce((sum, option) => sum + option.voteCount, 0) ??
			0;
		const isOpen = sitting.status === "voting";

		return buildPageMetadata({
			title: isOpen
				? `Book poll · ${sitting.displayName}`
				: `Voting results · ${sitting.displayName}`,
			description: isOpen
				? `Rank wishlist books for this BBRC sitting. ${sitting.poll.options.length} options · ${pollVotes} votes so far.`
				: `Archived poll results for ${sitting.displayName}.`,
			path: `/sittings/${sitting.slug}/vote`,
		});
	} catch {
		return buildNotFoundMetadata("Poll");
	}
}

export default async function SittingVotePage({
	params,
}: PageProps<"/sittings/[slug]/vote">) {
	const { slug } = await params;

	let sitting: Awaited<ReturnType<typeof loadSittingBySlugForIsr>>;
	try {
		sitting = await loadSittingBySlugForIsr(slug);
	} catch {
		notFound();
	}

	if (!sitting.poll) {
		redirect(`/sittings/${sitting.slug}`);
	}

	const participantUserIds = sitting.participants.map(
		(participant) => participant.userId,
	);
	const pollMode =
		sitting.status === "voting" ? ("vote" as const) : ("readonly" as const);

	return (
		<div className="flex flex-col gap-6">
			<SittingVotePageIntro
				sittingSlug={sitting.slug}
				sittingStatus={sitting.status}
				initialPoll={sitting.poll}
			/>
			<SittingPollSection
				sittingSlug={sitting.slug}
				sittingStatus={sitting.status}
				initialPoll={sitting.poll}
				participantUserIds={participantUserIds}
				mode={pollMode}
				selectedBookSlug={sitting.selectedBook?.slug ?? null}
				showCard={false}
				layout="page"
				showVoteShare
			/>
		</div>
	);
}
