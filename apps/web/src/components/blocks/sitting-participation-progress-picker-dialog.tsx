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
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import {
	progressIndicatorClassName,
	progressLabels,
} from "@/components/blocks/sitting-participation-progress";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
	applyProgressOptimistically,
	restoreProgress,
} from "@/lib/sitting/optimistic-progress";
import {
	canAdminSelectProgress,
	canMemberSelectProgress,
	type ParticipationProgress,
	progressChoicesForSitting,
} from "@/lib/sitting/participation-progress-ui";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

// "Reading" on your own status asks for the edition, like "I'm currently reading".
const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

type SittingParticipationProgressPickerDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sitting: Pick<GetSittingBySlugOutput, "slug" | "status" | "selectedBook">;
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
	const [startOpen, setStartOpen] = useState(false);
	const book = sitting.selectedBook;

	const { data: session } = authClient.useSession();

	function refreshSitting() {
		void queryClient.invalidateQueries({
			queryKey: orpc.sitting.getSittingBySlug.key(),
		});
		void queryClient.invalidateQueries({
			queryKey: orpc.sitting.getMySittingState.key(),
		});
	}

	const adminMutation = useMutation(
		orpc.sitting.updateParticipation.mutationOptions({
			scope: { id: `progress-${sitting.slug}-${participant.userId}` },
			onMutate: async (variables) => {
				const snapshot = await applyProgressOptimistically(
					sitting.slug,
					variables.userId,
					variables.progress,
					{ self: variables.userId === session?.user.id },
				);
				onOpenChange(false);
				return snapshot;
			},
			onError: (error, _variables, snapshot) => {
				restoreProgress(snapshot);
				toast.error(error.message);
			},
			onSuccess: () => {
				router.refresh();
			},
			onSettled: refreshSitting,
		}),
	);

	const selfMutation = useMutation(
		orpc.sitting.updateMyParticipationProgress.mutationOptions({
			scope: { id: `progress-${sitting.slug}-${participant.userId}` },
			onMutate: async (variables) => {
				const snapshot = await applyProgressOptimistically(
					sitting.slug,
					participant.userId,
					variables.progress,
					{ self: true },
				);
				onOpenChange(false);
				return snapshot;
			},
			onError: (error, _variables, snapshot) => {
				restoreProgress(snapshot);
				toast.error(error.message);
			},
			onSuccess: () => {
				router.refresh();
			},
			onSettled: refreshSitting,
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
		if (mode === "self" && next === "in_progress" && book) {
			onOpenChange(false);
			setStartOpen(true);
			return;
		}
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
		<>
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
											isCurrent &&
												"border-primary bg-primary/5 text-foreground",
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
												<span className="text-muted-foreground">
													{" "}
													(current)
												</span>
											) : null}
										</span>
									</LoadingButton>
								</li>
							);
						})}
					</ul>
				</DialogContent>
			</Dialog>
			{startOpen && book ? (
				<StartReadingDialog
					bookSlug={book.slug}
					bookTitle={book.title}
					bookPages={book.pages}
					open={startOpen}
					onOpenChange={setStartOpen}
					onStarting={() => {
						const snapshot = applyProgressOptimistically(
							sitting.slug,
							participant.userId,
							"in_progress",
							{ self: true },
						);
						return () => void snapshot.then(restoreProgress);
					}}
					onStarted={() => {
						refreshSitting();
						router.refresh();
					}}
				/>
			) : null}
		</>
	);
}
