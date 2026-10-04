"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PollVotesByVoterSectionProps = {
	sittingSlug: string;
};

function formatBallotSummary(choiceCount: number, maxChoices: number): string {
	if (choiceCount === 1 && maxChoices === 1) {
		return "1 book";
	}

	return `${choiceCount} of ${maxChoices} books`;
}

export function PollVotesByVoterSection({
	sittingSlug,
}: PollVotesByVoterSectionProps) {
	const [open, setOpen] = useState(false);

	const query = useQuery({
		...orpc.sitting.getPollVotesByUser.queryOptions({
			input: { sittingSlug },
		}),
		enabled: open,
	});

	const voters = query.data?.voters ?? [];

	return (
		<section className="border border-border">
			<Button
				type="button"
				variant="ghost"
				className="flex h-auto w-full items-center justify-between gap-2 px-4 py-3 text-left font-normal"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
			>
				<span className="font-medium text-sm">Votes by voter</span>
				<span className="flex items-center gap-2 text-muted-foreground text-xs">
					Admin only
					<ChevronDownIcon
						className={cn(
							"size-4 shrink-0 transition-transform",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</span>
			</Button>
			{open ? (
				<div className="border-border border-t px-4 py-4">
					{query.isPending ? (
						<div className="flex flex-col gap-2" aria-hidden>
							{Array.from({ length: 3 }, (_, index) => (
								<Skeleton key={index} className="h-20 w-full" />
							))}
						</div>
					) : query.isError ? (
						<p className="text-destructive text-sm">{query.error.message}</p>
					) : voters.length === 0 ? (
						<p className="text-muted-foreground text-sm">No votes yet.</p>
					) : (
						<ul className="flex flex-col gap-3">
							{voters.map((entry) => (
								<li
									key={entry.user.username}
									className="flex flex-col gap-2 border border-border p-3"
								>
									<div className="flex flex-wrap items-start justify-between gap-2">
										<Link
											href={`/users/${entry.user.username}` as Route}
											className="min-w-0 hover:underline"
										>
											<UserPanel user={entry.user} />
										</Link>
										<span className="text-muted-foreground text-xs tabular-nums">
											{formatBallotSummary(
												entry.choices.length,
												entry.maxChoices,
											)}
										</span>
									</div>
									<ol className="flex flex-col gap-1.5 pl-0">
										{entry.choices.map((choice) => (
											<li
												key={choice.pollOptionId}
												className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
											>
												<span className="min-w-0 font-medium">
													{choice.bookTitle}
												</span>
												<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
													{formatDateTime(choice.votedAt)}
												</span>
											</li>
										))}
									</ol>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</section>
	);
}
