import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SittingAdminActions } from "@/components/blocks/sitting-admin-actions";
import {
	SittingAdminDeadlines,
	SittingDeadlinesSummary,
} from "@/components/blocks/sitting-admin-deadlines";
import { SittingParticipantsCount } from "@/components/blocks/sitting-participants-count";
import { SittingParticipantsSection } from "@/components/blocks/sitting-participants-section";
import { SittingPhaseIntro } from "@/components/blocks/sitting-phase-intro";
import { SittingPollSection } from "@/components/blocks/sitting-poll-section";
import { SittingReadingBook } from "@/components/blocks/sitting-reading-book";
import { SittingReadingHero } from "@/components/blocks/sitting-reading-hero";
import { SittingReviewsSection } from "@/components/blocks/sitting-reviews-section";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { formatDateTime } from "@/lib/format-datetime";

type SittingDetailProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingDetail({ sitting }: SittingDetailProps) {
	const { status } = sitting;

	return (
		<div className="flex flex-col gap-8">
			<Link
				href={"/sittings" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All sittings
			</Link>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1.5">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{sitting.slug}
					</h1>
					<p className="text-muted-foreground text-sm">
						Started {formatDateTime(sitting.createdAt)}
					</p>
				</div>
				<div className="flex flex-col items-start gap-3 sm:items-end">
					<SittingStatusBadge status={status} />
					<div className="flex flex-wrap justify-end gap-2">
						<SittingAdminDeadlines sitting={sitting} />
						<SittingAdminActions sitting={sitting} />
					</div>
				</div>
			</div>

			<SittingPhaseIntro status={status} />

			<SittingDeadlinesSummary sitting={sitting} />

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<SittingParticipantsCount
					count={sitting.participants.length}
					sitting={sitting}
				/>
			</dl>

			{status === "voting" && sitting.poll ? (
				<SittingPollSection
					sittingSlug={sitting.slug}
					sittingStatus={status}
					initialPoll={sitting.poll}
					participantUserIds={sitting.participants.map(
						(participant) => participant.userId,
					)}
				/>
			) : null}

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
