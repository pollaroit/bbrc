"use client";

import type { GetMySittingStateOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Vote } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { SittingBookFeedbackPrompt } from "@/components/blocks/sitting-book-feedback-prompt";
import { progressLabels } from "@/components/blocks/sitting-participation-progress";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type Progress = NonNullable<GetMySittingStateOutput["progress"]>;

type SittingViewerActionProps = {
	sittingSlug: string;
	status: "voting" | "reading" | "finished";
	bookSlug: string | null;
	bookTitle: string | null;
};

/** Members can only move forward: not started -> reading -> completed. */
const nextProgress: Record<Progress, readonly Progress[]> = {
	not_started: ["in_progress", "completed"],
	in_progress: ["completed"],
	completed: [],
	dnf: [],
};

const trackedProgress = ["not_started", "in_progress", "completed"] as const;

const selectedClassName: Record<Progress, string> = {
	not_started: "border-warning bg-warning/10",
	in_progress: "border-primary bg-primary/10",
	completed: "border-success bg-success/10",
	dnf: "border-destructive bg-destructive/10",
};

const confirmCopy: Record<
	Progress,
	{ title: string; description: string; action: string }
> = {
	not_started: {
		title: "Mark as not started?",
		description: "You can't go back to this once you've started.",
		action: "Mark not started",
	},
	in_progress: {
		title: "Mark yourself as reading?",
		description:
			"The club will see that you've started the book. You can mark it finished whenever you're done.",
		action: "I'm reading",
	},
	completed: {
		title: "Mark the book as finished?",
		description:
			"This tells the club you finished the book and earns your reading points when the sitting ends. You can't undo it.",
		action: "I finished it",
	},
	dnf: {
		title: "Mark as did not finish?",
		description: "This is applied automatically when a sitting ends.",
		action: "Confirm",
	},
};

function ProgressControl({
	sittingSlug,
	current,
}: {
	sittingSlug: string;
	current: Progress;
}) {
	const router = useRouter();
	const [pendingChoice, setPendingChoice] = useState<Progress | null>(null);

	const mutation = useMutation(
		orpc.sitting.updateMyParticipationProgress.mutationOptions({
			onSuccess: async () => {
				setPendingChoice(null);
				toast.success("Progress updated");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.getMySittingState.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.getSittingBySlug.key(),
					}),
				]);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const options: Progress[] =
		current === "dnf" ? ["dnf"] : [...trackedProgress];

	return (
		<fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
			<legend className="mb-1.5 p-0 text-muted-foreground text-xs">
				Your progress
			</legend>
			<div className="grid grid-cols-3 gap-2">
				{options.map((option) => {
					const selected = option === current;
					const allowed = nextProgress[current].includes(option);
					return (
						<button
							key={option}
							type="button"
							aria-pressed={selected}
							disabled={mutation.isPending || (!selected && !allowed)}
							onClick={() => {
								if (!selected) {
									setPendingChoice(option);
								}
							}}
							className={cn(
								"border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed",
								selected
									? cn(selectedClassName[option], "font-medium")
									: allowed
										? "border-border hover:bg-muted/50"
										: "border-border text-muted-foreground opacity-50",
							)}
						>
							{progressLabels[option]}
						</button>
					);
				})}
			</div>
			<AlertDialog
				open={pendingChoice != null}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setPendingChoice(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
						<AlertDialogTitle>
							{pendingChoice ? confirmCopy[pendingChoice].title : ""}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingChoice ? confirmCopy[pendingChoice].description : ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={mutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<LoadingButton
							type="button"
							loading={mutation.isPending}
							onClick={() => {
								if (pendingChoice) {
									mutation.mutate({
										slug: sittingSlug,
										progress: pendingChoice,
									});
								}
							}}
						>
							{pendingChoice ? confirmCopy[pendingChoice].action : "Confirm"}
						</LoadingButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</fieldset>
	);
}

export function SittingViewerAction({
	sittingSlug,
	status,
	bookSlug,
	bookTitle,
}: SittingViewerActionProps) {
	const { data: session } = authClient.useSession();

	const stateQuery = useQuery({
		...orpc.sitting.getMySittingState.queryOptions({ input: sittingSlug }),
		enabled: Boolean(session?.user),
	});

	if (!session?.user || !stateQuery.data) {
		return null;
	}

	const state = stateQuery.data;
	if (!state.isParticipant) {
		return null;
	}

	if (status === "voting") {
		return (
			<Button
				className="w-fit"
				nativeButton={false}
				render={<Link href={`/sittings/${sittingSlug}/vote` as Route} />}
			>
				<Vote data-icon="inline-start" aria-hidden />
				{state.hasVoted ? "Change my votes" : "Vote now"}
			</Button>
		);
	}

	if (status === "reading" && state.progress) {
		return (
			<ProgressControl sittingSlug={sittingSlug} current={state.progress} />
		);
	}

	if (status === "finished" && bookSlug && bookTitle) {
		return (
			<div className="flex flex-col items-start gap-2">
				<SittingBookFeedbackPrompt bookSlug={bookSlug} bookTitle={bookTitle} />
			</div>
		);
	}

	return null;
}
