"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

type PollOptionVotersDialogProps = {
	pollOptionId: string | null;
	voteCount: number;
	onDismiss: () => void;
};

function formatBallotSummary(
	totalSelections: number,
	maxChoices: number,
): string {
	if (totalSelections === 1) {
		return "Single selection (only this book)";
	}

	return `${totalSelections} of ${maxChoices} selections`;
}

export function PollOptionVotersDialog({
	pollOptionId,
	voteCount,
	onDismiss,
}: PollOptionVotersDialogProps) {
	const open = pollOptionId != null;

	const query = useQuery({
		...orpc.sitting.getPollOptionVotes.queryOptions({
			input: { pollOptionId: pollOptionId! },
		}),
		enabled: open,
	});

	const voters = query.data?.voters ?? [];
	const bookTitle = query.data?.bookTitle;

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onDismiss();
				}
			}}
		>
			<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="border-border border-b p-4">
					<DialogTitle>Votes for this book</DialogTitle>
					<DialogDescription>
						{bookTitle ? (
							<span className="line-clamp-2">{bookTitle}</span>
						) : (
							<span>
								{voteCount === 1
									? "1 vote on this option."
									: `${voteCount} votes on this option.`}
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					{query.isPending ? (
						<div className="flex flex-col gap-2" aria-hidden>
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-16 w-full" />
							))}
						</div>
					) : query.isError ? (
						<p className="text-destructive text-sm">{query.error.message}</p>
					) : voters.length === 0 ? (
						<p className="text-muted-foreground text-sm">No votes yet.</p>
					) : (
						<ul className="flex flex-col gap-2">
							{voters.map((entry) => (
								<li key={`${entry.user.username}-${entry.votedAt.toString()}`}>
									<Link
										href={`/users/${entry.user.username}` as Route}
										className="flex flex-col gap-1 rounded-md border px-3 py-2 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
									>
										<UserPanel user={entry.user} className="min-w-0" />
										<div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
											<span className="text-muted-foreground text-xs tabular-nums">
												{formatDateTime(entry.votedAt)}
											</span>
											<span className="text-muted-foreground text-xs">
												{formatBallotSummary(
													entry.totalSelections,
													entry.maxChoices,
												)}
											</span>
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
