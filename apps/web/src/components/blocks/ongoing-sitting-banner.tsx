import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Progress, ProgressLabel } from "@bbrc/ui/components/progress";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SittingParticipantAvatarStack } from "@/components/blocks/sitting-participant-avatar-stack";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { formatBookAuthors } from "@/lib/book-cover";
import { formatDateTimeCompact } from "@/lib/format-datetime";
import {
	getSittingDeadlineProgress,
	getSittingPhaseDeadline,
	getSittingPhaseDeadlineLabel,
} from "@/lib/sitting-deadline";

type OngoingSittingBannerProps = {
	sitting: NonNullable<GetOngoingSittingOutput>;
};

export function OngoingSittingBanner({ sitting }: OngoingSittingBannerProps) {
	const href =
		sitting.status === "voting"
			? (`/sittings/${sitting.slug}/vote` as Route)
			: (`/sittings/${sitting.slug}` as Route);

	const phaseDeadline = getSittingPhaseDeadline(sitting);
	const deadlineLabel = getSittingPhaseDeadlineLabel(sitting);
	const deadlineProgress = getSittingDeadlineProgress(sitting);

	const bookTitle = sitting.selectedBookTitle?.trim();
	const authorsLabel =
		sitting.selectedBookAuthors.length > 0
			? formatBookAuthors(sitting.selectedBookAuthors)
			: null;

	return (
		<Card className="border-primary/30 bg-primary/5">
			<CardContent className="flex flex-col gap-3 p-4">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						{bookTitle ? (
							<>
								<h2 className="font-semibold text-lg leading-snug tracking-tight">
									{bookTitle}
								</h2>
								{authorsLabel ? (
									<p className="mt-1 text-muted-foreground text-sm">
										{authorsLabel}
									</p>
								) : null}
							</>
						) : (
							<h2 className="font-semibold text-lg leading-snug tracking-tight">
								{sitting.displayName}
							</h2>
						)}
					</div>
					<SittingStatusBadge status={sitting.status} />
				</div>

				{phaseDeadline ? (
					deadlineProgress != null ? (
						<Progress value={deadlineProgress} className="gap-1.5">
							<div className="flex w-full items-baseline justify-between gap-2">
								<ProgressLabel className="text-muted-foreground">
									{deadlineLabel}
								</ProgressLabel>
								<span className="text-muted-foreground text-xs tabular-nums">
									{formatDateTimeCompact(phaseDeadline)}
								</span>
							</div>
						</Progress>
					) : (
						<p className="text-muted-foreground text-xs">
							{deadlineLabel}: {formatDateTimeCompact(phaseDeadline)}
						</p>
					)
				) : null}

				<div className="flex flex-wrap items-center gap-2.5">
					<span className="text-muted-foreground text-sm">Participants</span>
					<SittingParticipantAvatarStack
						participants={sitting.participantPreview}
						totalCount={sitting.participantCount}
					/>
				</div>

				<div className="flex justify-end pt-1">
					<Button
						render={<Link href={href} />}
						nativeButton={false}
						size="sm"
						className="w-full md:w-auto"
					>
						{sitting.status === "voting" ? "Vote in poll" : "Open sitting"}
						<ArrowRight data-icon="inline-end" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
