import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { Route } from "next";
import Link from "next/link";
import { SittingDeadlinesSummary } from "@/components/blocks/sitting-admin-deadlines";
import { SittingParticipantsCount } from "@/components/blocks/sitting-participants-count";
import { SittingParticipantsSection } from "@/components/blocks/sitting-participants-section";
import { SittingPhaseIntro } from "@/components/blocks/sitting-phase-intro";
import { SittingReadingBook } from "@/components/blocks/sitting-reading-book";
import { SittingReadingHero } from "@/components/blocks/sitting-reading-hero";
import { SittingReviewsSection } from "@/components/blocks/sitting-reviews-section";
import { SittingVotePrompt } from "@/components/blocks/sitting-vote-prompt";

type SittingDetailProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingDetail({ sitting }: SittingDetailProps) {
	const { status } = sitting;

	return (
		<div className="flex flex-col gap-8">
			<SittingPhaseIntro status={status} />

			<SittingDeadlinesSummary sitting={sitting} />

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<SittingParticipantsCount
					count={sitting.participants.length}
					sitting={sitting}
				/>
			</dl>

			<SittingVotePrompt sitting={sitting} />

			{status === "reading" ? (
				<div className="flex flex-col gap-10">
					<SittingReadingHero sitting={sitting} />
					<SittingParticipantsSection
						status={status}
						participants={sitting.participants}
					/>
				</div>
			) : null}

			{status === "finished" ? (
				<div className="flex flex-col gap-10">
					{sitting.selectedBook ? (
						<SittingReadingBook
							book={sitting.selectedBook}
							heading="Book we read"
							footer={
								<p className="text-muted-foreground text-sm">
									Completed the book?{" "}
									<Link
										href={`/books/${sitting.selectedBook.slug}` as Route}
										className="font-medium text-foreground underline-offset-4 hover:underline"
									>
										Leave feedback on the book page
									</Link>
									.
								</p>
							}
						/>
					) : null}
					<SittingReviewsSection
						reviews={sitting.reviews}
						participantCount={sitting.participants.length}
					/>
					<SittingParticipantsSection
						status={status}
						participants={sitting.participants}
					/>
				</div>
			) : null}

			{status === "voting" ? (
				<SittingParticipantsSection
					status={status}
					participants={sitting.participants}
				/>
			) : null}
		</div>
	);
}
