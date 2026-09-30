import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingPollHistoryDialog } from "@/components/blocks/sitting-poll-history-dialog";

type SittingParticipantsCountProps = {
	count: number;
	sitting: GetSittingBySlugOutput;
};

export function SittingParticipantsCount({
	count,
	sitting,
}: SittingParticipantsCountProps) {
	const poll = sitting.poll;
	const showPollHistory =
		(sitting.status === "reading" || sitting.status === "finished") &&
		poll != null;

	return (
		<div>
			<dt className="text-muted-foreground text-xs">Participants</dt>
			<dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium tabular-nums">
				<span>{count}</span>
				{showPollHistory ? (
					<SittingPollHistoryDialog
						sittingSlug={sitting.slug}
						sittingStatus={sitting.status}
						poll={poll}
						participantUserIds={sitting.participants.map(
							(participant) => participant.userId,
						)}
						selectedBookSlug={sitting.selectedBook?.slug ?? null}
					/>
				) : null}
			</dd>
		</div>
	);
}
