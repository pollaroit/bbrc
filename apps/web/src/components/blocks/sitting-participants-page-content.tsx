"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { useMemo } from "react";
import { SittingParticipantCard } from "@/components/blocks/sitting-participant-card";
import { SittingParticipantCardFooter } from "@/components/blocks/sitting-participant-card-footer";
import {
	SittingParticipantsAdminToolbar,
	SittingRemovedParticipantsSection,
	useParticipantRemoveDialog,
} from "@/components/blocks/sitting-participants-admin-panel";
import { cn } from "@/lib/utils";

type SittingParticipantsPageContentProps = {
	sitting: GetSittingBySlugOutput;
	isAdmin: boolean;
	viewerUserId: string;
};

export function SittingParticipantsPageContent({
	sitting,
	isAdmin,
	viewerUserId,
}: SittingParticipantsPageContentProps) {
	const { canRemove, requestRemove, removeDialog } =
		useParticipantRemoveDialog(sitting);

	const participants = useMemo(() => {
		if (sitting.status !== "voting") {
			return sitting.participants;
		}

		return [...sitting.participants].toSorted((a, b) => {
			const rankA = a.pollChipRank ?? 99;
			const rankB = b.pollChipRank ?? 99;
			if (rankA !== rankB) {
				return rankA - rankB;
			}

			return b.rp - a.rp;
		});
	}, [sitting.participants, sitting.status]);

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
					{participants.map((participant) => (
						<li
							key={participant.userId}
							className="flex flex-col overflow-hidden bg-card ring-1 ring-foreground/10"
						>
							<SittingParticipantCard
								participant={participant}
								sittingStatus={sitting.status}
								className="ring-0"
							/>
							<SittingParticipantCardFooter
								sitting={sitting}
								participant={participant}
								viewerUserId={viewerUserId}
								isAdmin={isAdmin}
								canRemoveParticipant={canRemove}
								onRemove={() => requestRemove(participant)}
								removeDisabled={
									sitting.participants.length <= 1 ||
									participant.progress === "completed"
								}
								removeDisabledReason={
									participant.progress === "completed"
										? "Members who finished the book stay on the roster"
										: sitting.participants.length <= 1
											? "At least one participant must remain"
											: undefined
								}
							/>
						</li>
					))}
				</ul>
			</section>

			{isAdmin ? <SittingRemovedParticipantsSection sitting={sitting} /> : null}

			{removeDialog}
		</div>
	);
}
