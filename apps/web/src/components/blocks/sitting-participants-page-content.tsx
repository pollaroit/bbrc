"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingParticipantCard } from "@/components/blocks/sitting-participant-card";
import {
	ParticipantRemoveButton,
	SittingParticipantsAdminToolbar,
	SittingRemovedParticipantsSection,
	useParticipantRemoveDialog,
} from "@/components/blocks/sitting-participants-admin-panel";
import { cn } from "@/lib/utils";

type SittingParticipantsPageContentProps = {
	sitting: GetSittingBySlugOutput;
	isAdmin: boolean;
};

export function SittingParticipantsPageContent({
	sitting,
	isAdmin,
}: SittingParticipantsPageContentProps) {
	const { canRemove, requestRemove, removeDialog } =
		useParticipantRemoveDialog(sitting);

	const showAdminActions = isAdmin && canRemove;

	return (
		<div className="flex flex-col gap-6">
			{isAdmin ? (
				<div className="flex flex-wrap items-center justify-end gap-2">
					<SittingParticipantsAdminToolbar sitting={sitting} />
				</div>
			) : null}

			<section className="flex flex-col gap-3">
				<h3 className="sr-only">Active participants</h3>
				<ul
					className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3")}
				>
					{sitting.participants.map((participant) => (
						<li key={participant.userId} className="flex flex-col gap-2">
							<SittingParticipantCard
								participant={participant}
								sittingStatus={sitting.status}
							/>
							{showAdminActions ? (
								<ParticipantRemoveButton
									onRemove={() => requestRemove(participant)}
									disabled={
										sitting.participants.length <= 1 ||
										participant.progress === "completed"
									}
									title={
										participant.progress === "completed"
											? "Members who finished the book stay on the roster"
											: undefined
									}
								/>
							) : null}
						</li>
					))}
				</ul>
			</section>

			{isAdmin ? <SittingRemovedParticipantsSection sitting={sitting} /> : null}

			{removeDialog}
		</div>
	);
}
