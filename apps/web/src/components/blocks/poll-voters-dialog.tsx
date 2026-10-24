"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";

export type PollVoterRow = {
	username: string;
	name: string;
	image: string | null;
	/** Position they gave this option, for ranking polls. */
	rank?: number | null;
	votedAt?: Date | null;
};

/** Everyone who chose one option. */
export function PollVotersDialog({
	open,
	onOpenChange,
	title,
	voters,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	voters: PollVoterRow[];
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] gap-4 overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="line-clamp-2">{title}</DialogTitle>
					<DialogDescription>
						{voters.length} {voters.length === 1 ? "member" : "members"} chose
						this.
					</DialogDescription>
				</DialogHeader>
				{voters.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nobody yet.</p>
				) : (
					<ul className="divide-y divide-border border border-border">
						{voters.map((voter) => (
							<li key={voter.username}>
								<Link
									href={`/users/${voter.username}` as Route}
									className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
								>
									<UserAvatar user={voter} className="size-9" />
									<span className="min-w-0 flex-1 truncate font-medium text-sm">
										{voter.name}
									</span>
									{voter.rank != null ? (
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											ranked #{voter.rank}
										</span>
									) : null}
									{voter.votedAt ? (
										<RelativeTime
											date={voter.votedAt}
											className="shrink-0 text-muted-foreground text-xs"
										/>
									) : null}
								</Link>
							</li>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}
