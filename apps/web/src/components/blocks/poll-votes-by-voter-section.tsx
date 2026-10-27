"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PollVotesByVoterSectionProps = {
	sittingSlug: string;
};

const chipClass = {
	1: "border-border",
	2: "border-border bg-muted text-foreground",
	3: "border-warning/60 bg-warning/15 text-warning-ink",
} as const;

const chipTag = { 1: null, 2: "Silver", 3: "Golden" } as const;

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
				<span className="flex items-baseline gap-2">
					<span className="font-medium text-sm">Votes by voter</span>
					{query.data ? (
						<span className="text-muted-foreground text-xs tabular-nums">
							{voters.length} {voters.length === 1 ? "voter" : "voters"}
						</span>
					) : null}
				</span>
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
				<div className="border-border border-t">
					{query.isPending ? (
						<div className="flex flex-col gap-px p-px" aria-hidden>
							{Array.from({ length: 3 }, (_, index) => (
								<Skeleton key={index} className="h-20 w-full" />
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
								<li
									key={entry.user.username}
									className="flex flex-col gap-2 px-4 py-3"
								>
									<div className="flex items-center justify-between gap-2">
										<Link
											href={`/users/${entry.user.username}` as Route}
											className="min-w-0 hover:underline"
										>
											<UserPanel user={entry.user} renderDescription={false} />
										</Link>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{entry.choices.length} of {entry.maxChoices}{" "}
											{entry.maxChoices === 1 ? "book" : "books"}
										</span>
									</div>
									<ul className="flex flex-wrap gap-1.5">
										{entry.choices
											.toSorted((a, b) => b.points - a.points)
											.map((choice) => (
												<li
													key={choice.pollOptionId}
													className={cn(
														"inline-flex items-center gap-1.5 border px-2 py-1 text-xs",
														chipClass[choice.points],
													)}
												>
													{choice.bookTitle}
													{chipTag[choice.points] ? (
														<span className="font-medium">
															· {chipTag[choice.points]}
														</span>
													) : null}
												</li>
											))}
									</ul>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</section>
	);
}
