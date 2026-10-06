"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { ProgressSchema } from "@bbrc/schemas";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import {
	progressIndicatorClassName,
	progressLabels,
} from "@/components/blocks/sitting-participation-progress";
import { SittingParticipationProgressPickerDialog } from "@/components/blocks/sitting-participation-progress-picker-dialog";
import { cn } from "@/lib/utils";

type Participant = GetSittingBySlugOutput["participants"][number];
type ParticipationProgress = z.infer<typeof ProgressSchema>;

type SittingParticipantCardFooterProps = {
	sitting: GetSittingBySlugOutput;
	participant: Participant;
	viewerUserId: string;
	isAdmin: boolean;
	canRemoveParticipant: boolean;
	onRemove: () => void;
	removeDisabled?: boolean;
	removeDisabledReason?: string;
};

function ProgressStatusTrigger({
	progress,
	showYou,
	interactive,
	onClick,
}: {
	progress: ParticipationProgress;
	showYou: boolean;
	interactive: boolean;
	onClick: () => void;
}) {
	const content = (
		<>
			<span
				className={cn("size-2 shrink-0", progressIndicatorClassName[progress])}
				aria-hidden
			/>
			<span>{progressLabels[progress]}</span>
			{showYou ? (
				<Badge variant="secondary" className="h-5 px-1.5">
					You
				</Badge>
			) : null}
			{interactive ? (
				<ChevronRightIcon
					className="size-3.5 shrink-0 text-muted-foreground"
					aria-hidden
				/>
			) : null}
		</>
	);

	if (!interactive) {
		return (
			<p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
				{content}
			</p>
		);
	}

	return (
		<button
			type="button"
			className="flex min-w-0 max-w-full items-center gap-x-1.5 gap-y-1 text-left text-muted-foreground text-xs transition-colors hover:text-foreground"
			onClick={onClick}
		>
			{content}
		</button>
	);
}

export function SittingParticipantCardFooter({
	sitting,
	participant,
	viewerUserId,
	isAdmin,
	canRemoveParticipant,
	onRemove,
	removeDisabled,
	removeDisabledReason,
}: SittingParticipantCardFooterProps) {
	const [progressDialogOpen, setProgressDialogOpen] = useState(false);
	const isSelf = participant.userId === viewerUserId;
	const showReadingProgress =
		sitting.status === "reading" || sitting.status === "finished";
	const showRemove = isAdmin && canRemoveParticipant;

	const canOpenProgressDialog =
		showReadingProgress &&
		(isAdmin
			? sitting.status === "reading" || sitting.status === "finished"
			: isSelf && sitting.status === "reading");

	if (!showReadingProgress && !showRemove) {
		return null;
	}

	return (
		<>
			<div className="flex items-center justify-between gap-3 border-border/60 border-t px-3 py-2.5">
				<div className="min-w-0 flex-1">
					{showReadingProgress ? (
						<ProgressStatusTrigger
							progress={participant.progress}
							showYou={isSelf}
							interactive={canOpenProgressDialog}
							onClick={() => setProgressDialogOpen(true)}
						/>
					) : (
						<p className="text-muted-foreground text-xs">On roster</p>
					)}
				</div>

				{showRemove ? (
					<Button
						type="button"
						variant="outline"
						size="xs"
						className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
						disabled={removeDisabled}
						title={removeDisabled ? removeDisabledReason : undefined}
						onClick={onRemove}
					>
						Remove
					</Button>
				) : null}
			</div>

			{canOpenProgressDialog ? (
				<SittingParticipationProgressPickerDialog
					open={progressDialogOpen}
					onOpenChange={setProgressDialogOpen}
					sitting={sitting}
					participant={{
						userId: participant.userId,
						name: participant.name,
						progress: participant.progress,
					}}
					mode={isAdmin ? "admin" : "self"}
				/>
			) : null}
		</>
	);
}
