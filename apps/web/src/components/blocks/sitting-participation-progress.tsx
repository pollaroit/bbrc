"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { ProgressSchema } from "@bbrc/schemas";
import { Badge } from "@bbrc/ui/components/badge";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type ParticipationProgress = z.infer<typeof ProgressSchema>;

const progressLabels: Record<ParticipationProgress, string> = {
	not_started: "Not started",
	in_progress: "Reading",
	completed: "Completed",
	dnf: "Did not finish",
};

type SittingParticipationProgressProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	participants: GetSittingBySlugOutput["participants"];
};

export function SittingParticipationProgress({
	sittingSlug,
	sittingStatus,
	participants,
}: SittingParticipationProgressProps) {
	const router = useRouter();
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const myParticipation = useMemo(
		() =>
			participants.find(
				(participant) => participant.userId === session?.user.id,
			),
		[participants, session?.user.id],
	);

	const mutation = useMutation(
		orpc.sitting.updateMyParticipationProgress.mutationOptions({
			onSuccess: async () => {
				toast.success("Reading status updated");
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (
		sessionPending ||
		!session?.user ||
		sittingStatus !== "reading" ||
		!myParticipation
	) {
		return null;
	}

	const current = myParticipation.progress;

	const actions: { label: string; progress: ParticipationProgress }[] = [];

	if (current === "not_started") {
		actions.push(
			{ label: "Started reading", progress: "in_progress" },
			{ label: "Finished book", progress: "completed" },
		);
	} else if (current === "in_progress") {
		actions.push({ label: "Finished book", progress: "completed" });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-muted-foreground text-sm">Your status</span>
				<Badge variant="outline">{progressLabels[current]}</Badge>
			</div>
			{actions.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{actions.map((action) => (
						<LoadingButton
							key={action.progress}
							type="button"
							size="sm"
							variant={action.progress === "completed" ? "default" : "outline"}
							loading={
								mutation.isPending &&
								mutation.variables?.progress === action.progress
							}
							onClick={() =>
								mutation.mutate({
									slug: sittingSlug,
									progress: action.progress,
								})
							}
						>
							{action.label}
						</LoadingButton>
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">
					{current === "completed"
						? "You marked this read complete."
						: "No further updates during this phase."}
				</p>
			)}
		</div>
	);
}

export { progressLabels };
