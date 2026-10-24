import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Progress, ProgressLabel } from "@bbrc/ui/components/progress";
import { OngoingSittingAction } from "@/components/blocks/ongoing-sitting-action";
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
					<OngoingSittingAction
						slug={sitting.slug}
						status={sitting.status}
						deadline={phaseDeadline ?? sitting.createdAt}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
