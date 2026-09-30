"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useState } from "react";
import { SittingPollSection } from "@/components/blocks/sitting-poll-section";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;

type SittingPollHistoryDialogProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	poll: SittingPoll;
	participantUserIds: string[];
	selectedBookSlug: string | null;
};

export function SittingPollHistoryDialog({
	sittingSlug,
	sittingStatus,
	poll,
	participantUserIds,
	selectedBookSlug,
}: SittingPollHistoryDialogProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="link"
				className="h-auto p-0 text-muted-foreground text-xs"
				onClick={() => setOpen(true)}
			>
				Show voting
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
					<DialogHeader className="border-border border-b p-4">
						<DialogTitle>Voting poll</DialogTitle>
						<DialogDescription>
							Read-only snapshot of how this sitting&apos;s book poll looked
							during the voting phase.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<SittingPollSection
							sittingSlug={sittingSlug}
							sittingStatus={sittingStatus}
							initialPoll={poll}
							participantUserIds={participantUserIds}
							mode="readonly"
							selectedBookSlug={selectedBookSlug}
							showCard={false}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
