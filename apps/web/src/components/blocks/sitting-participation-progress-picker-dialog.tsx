"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	progressIndicatorClassName,
	progressLabels,
} from "@/components/blocks/sitting-participation-progress";
import {
	canAdminSelectProgress,
	canMemberSelectProgress,
	type ParticipationProgress,
	progressChoicesForSitting,
} from "@/lib/sitting/participation-progress-ui";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type SittingParticipationProgressPickerDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sitting: Pick<GetSittingBySlugOutput, "slug" | "status">;
	participant: {
		userId: string;
		name: string;
		progress: ParticipationProgress;
	};
	mode: "self" | "admin";
};

export function SittingParticipationProgressPickerDialog({
	open,
	onOpenChange,
	sitting,
	participant,
	mode,
}: SittingParticipationProgressPickerDialogProps) {
	const router = useRouter();
	const choices = progressChoicesForSitting(sitting.status);

	const adminMutation = useMutation(
		orpc.sitting.updateParticipation.mutationOptions({
			onSuccess: async () => {
				toast.success("Reading status updated");
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				onOpenChange(false);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const selfMutation = useMutation(
		orpc.sitting.updateMyParticipationProgress.mutationOptions({
			onSuccess: async () => {
				toast.success("Reading status updated");
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				onOpenChange(false);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const pendingProgress =
		mode === "admin"
			? adminMutation.variables?.progress
			: selfMutation.variables?.progress;
	const isPending = adminMutation.isPending || selfMutation.isPending;

	function isSelectable(next: ParticipationProgress) {
		if (mode === "admin") {
			return canAdminSelectProgress(sitting.status, next, participant.progress);
		}
		return canMemberSelectProgress(participant.progress, next);
	}

	function selectProgress(next: ParticipationProgress) {
		if (!isSelectable(next)) return;
		if (mode === "admin") {
			adminMutation.mutate({
				slug: sitting.slug,
				userId: participant.userId,
				progress: next,
			});
			return;
		}
		selfMutation.mutate({ slug: sitting.slug, progress: next });
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Reading status</DialogTitle>
					<DialogDescription>
						{mode === "self"
							? "Choose your reading status for this sitting."
							: `Set reading status for ${participant.name}.`}
					</DialogDescription>
				</DialogHeader>
				<ul className="flex flex-col gap-2">
					{choices.map((progress) => {
						const isCurrent = progress === participant.progress;
						const selectable = isSelectable(progress);
						return (
							<li key={progress}>
								<LoadingButton
									type="button"
									variant="outline"
									loading={isPending && pendingProgress === progress}
									disabled={!selectable}
									className={cn(
										"h-auto w-full justify-start gap-2 px-3 py-2.5 font-normal",
										isCurrent && "border-primary bg-primary/5 text-foreground",
										!selectable && !isCurrent && "opacity-50",
									)}
									onClick={() => selectProgress(progress)}
								>
									<span
										className={cn(
											"size-2 shrink-0",
											progressIndicatorClassName[progress],
										)}
										aria-hidden
									/>
									<span className="text-left text-xs">
										{progressLabels[progress]}
										{isCurrent ? (
											<span className="text-muted-foreground"> (current)</span>
										) : null}
									</span>
								</LoadingButton>
							</li>
						);
					})}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
