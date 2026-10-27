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
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PollOptionVotersDialogProps = {
	pollOptionId: string | null;
	voteCount: number;
	onDismiss: () => void;
};

const weightLabel = {
	1: "1 pt",
	2: "Silver · 2 pts",
	3: "Golden · 3 pts",
} as const;

const weightClass = {
	1: "border-border text-muted-foreground",
	2: "border-border bg-muted text-foreground",
	3: "border-warning/60 bg-warning/15 text-warning-ink",
} as const;

function ballotNote(totalSelections: number, maxChoices: number): string {
	return totalSelections === 1
		? "Only voted for this book"
		: `Picked ${totalSelections} of ${maxChoices} books`;
}

export function PollOptionVotersDialog({
	pollOptionId,
	voteCount,
	onDismiss,
}: PollOptionVotersDialogProps) {
	const open = pollOptionId != null;

	const query = useQuery({
		...orpc.sitting.getPollOptionVotes.queryOptions({
			input: { pollOptionId: pollOptionId ?? "" },
		}),
		enabled: open,
	});

	const voters = (query.data?.voters ?? []).toSorted(
		(a, b) => b.points - a.points,
	);
	const totalPoints = voters.reduce((sum, entry) => sum + entry.points, 0);
	const golden = voters.filter((entry) => entry.points === 3).length;
	const silver = voters.filter((entry) => entry.points === 2).length;
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
			<DialogContent className="flex max-h-[min(90vh,600px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="gap-1 border-border border-b p-4 pr-10">
					<DialogDescription className="text-xs">Votes for</DialogDescription>
					<DialogTitle className="line-clamp-2 text-base leading-snug">
						{bookTitle ?? "this book"}
					</DialogTitle>
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-muted-foreground text-xs tabular-nums">
						<span>
							<span className="font-medium text-foreground">
								{query.data ? totalPoints : "—"} pts
							</span>
						</span>
						<span>
							{query.data ? voters.length : voteCount}{" "}
							{(query.data ? voters.length : voteCount) === 1
								? "voter"
								: "voters"}
						</span>
						{golden > 0 ? <span>{golden} golden</span> : null}
						{silver > 0 ? <span>{silver} silver</span> : null}
					</p>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{query.isPending ? (
						<div className="flex flex-col gap-px p-px" aria-hidden>
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-14 w-full" />
							))}
						</div>
					) : query.isError ? (
						<p className="p-4 text-destructive text-sm">
							{query.error.message}
						</p>
					) : voters.length === 0 ? (
						<p className="p-4 text-muted-foreground text-sm">No votes yet.</p>
					) : (
						<ul className="divide-y divide-border">
							{voters.map((entry) => (
								<li key={entry.user.username}>
									<Link
										href={`/users/${entry.user.username}` as Route}
										className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
									>
										<span className="flex min-w-0 flex-col gap-0.5">
											<UserPanel
												user={entry.user}
												renderDescription={false}
												className="min-w-0"
											/>
											<span className="pl-0 text-muted-foreground text-xs">
												{ballotNote(entry.totalSelections, entry.maxChoices)}
											</span>
										</span>
										<span
											className={cn(
												"shrink-0 border px-2 py-0.5 text-xs tabular-nums",
												weightClass[entry.points],
											)}
										>
											{weightLabel[entry.points]}
										</span>
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
