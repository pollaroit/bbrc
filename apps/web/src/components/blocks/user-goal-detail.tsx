"use client";

import { formatReadFinishedMonth } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useState } from "react";
import { EditGoalDialog } from "@/components/blocks/edit-goal-dialog";
import { GoalProgressBar } from "@/components/blocks/goal-progress-bar";
import { GoalScopeChips } from "@/components/blocks/goal-scope-chips";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type UserGoalDetailProps = {
	username: string;
	goalSlug: string;
};

export function UserGoalDetail({ username, goalSlug }: UserGoalDetailProps) {
	const [editOpen, setEditOpen] = useState(false);

	const detailQuery = useQuery(
		orpc.goal.getBySlug.queryOptions({
			input: { username, goalSlug },
		}),
	);

	if (detailQuery.isPending) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (detailQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{detailQuery.error.message ?? "Could not load this goal."}
			</p>
		);
	}

	const goal = detailQuery.data;
	const remaining = Math.max(0, goal.target - goal.current);
	const yearEnd = new Date(goal.year, 11, 31, 23, 59, 59);
	const daysLeft = Math.max(
		0,
		Math.ceil((yearEnd.getTime() - Date.now()) / 86_400_000),
	);

	return (
		<div className="flex flex-col gap-6">
			<header
				className={cn(
					"flex flex-col gap-4 border border-border p-4 sm:p-5",
					goal.isComplete && "border-success/50 bg-success/5",
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<h1 className="font-semibold text-xl tracking-tight sm:text-2xl">
								{goal.title}
							</h1>
							{goal.isComplete ? (
								<Badge className="border-success/30 bg-success text-white">
									Complete
								</Badge>
							) : null}
							{goal.isExpired && !goal.isComplete ? (
								<Badge variant="secondary">Expired</Badge>
							) : null}
						</div>
						<p className="mt-0.5 text-muted-foreground text-sm tabular-nums">
							{goal.year}
						</p>
					</div>
					<div className="flex shrink-0 divide-x divide-border border border-border">
						<ResourceShareMenu
							path={`/users/${username}/goals/${goalSlug}`}
							shareText={goal.title}
							label="Share goal"
							size="md"
							iconOnly
							triggerClassName="size-8 px-0 text-foreground"
						/>
						{goal.isOwner ? (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8"
								aria-label="Edit goal"
								onClick={() => setEditOpen(true)}
							>
								<Pencil className="size-4" aria-hidden="true" />
							</Button>
						) : null}
					</div>
				</div>

				{goal.description ? (
					<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
						{goal.description}
					</p>
				) : null}

				<GoalScopeChips scope={goal.scope} max={8} />

				<div className="flex flex-col gap-3 border-border border-t pt-4">
					<GoalProgressBar
						current={goal.current}
						target={goal.target}
						isComplete={goal.isComplete}
					/>
					{goal.isComplete ? (
						<p className="text-sm">
							Target reached
							{goal.current > goal.target
								? ` with ${goal.current - goal.target} to spare`
								: ""}
							.
						</p>
					) : (
						<p className="text-muted-foreground text-sm tabular-nums">
							{remaining} {remaining === 1 ? "book" : "books"} to go
							{goal.isExpired
								? ""
								: ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left in ${goal.year}`}
						</p>
					)}
				</div>
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="font-semibold text-base tracking-tight">
					Books counted{" "}
					<span className="font-normal text-muted-foreground tabular-nums">
						({goal.books.length})
					</span>
				</h2>

				{goal.books.length === 0 ? (
					<div className="border border-border border-dashed px-6 py-10 text-center">
						<p className="font-medium">No qualifying reads yet</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Mark books as read with a finish month in {goal.year} to make
							progress.
						</p>
					</div>
				) : (
					<ul className="divide-y divide-border border border-border">
						{goal.books.map((entry) => {
							const coverSrc = bookCoverUrl(entry.book.coverId);
							const finishedLabel = formatReadFinishedMonth({
								year: entry.readEndYear,
								month: entry.readEndMonth,
							});

							return (
								<li key={entry.book.slug}>
									<Link
										href={`/books/${entry.book.slug}` as Route}
										className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/40"
									>
										<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="48px"
												/>
											) : null}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block font-medium text-sm leading-snug">
												{entry.book.title}
											</span>
											<span className="block text-muted-foreground text-sm">
												{formatBookAuthors(entry.book.authors)}
											</span>
										</span>
										<span className="shrink-0 text-muted-foreground text-xs">
											{finishedLabel}
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			{goal.isOwner ? (
				<EditGoalDialog
					open={editOpen}
					onOpenChange={setEditOpen}
					username={username}
					goal={goal}
				/>
			) : null}
		</div>
	);
}
