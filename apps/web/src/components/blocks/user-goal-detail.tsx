"use client";

import { formatReadFinishedMonth } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EditGoalDialog } from "@/components/blocks/edit-goal-dialog";
import { GoalProgressBar } from "@/components/blocks/goal-progress-bar";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatGoalScopeSummary } from "@/lib/goal-scope-ui";
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
	const scopeSummary = formatGoalScopeSummary(goal.scope);
	const backHref = `/users/${username}/goals` as Route;

	return (
		<div className="flex flex-col gap-8">
			<p className="text-sm">
				<Link
					href={backHref}
					className="text-muted-foreground hover:text-foreground"
				>
					← All goals
				</Link>
			</p>

			<header
				className={cn(
					"space-y-4 border border-border p-6",
					goal.isComplete &&
						"border-emerald-600/50 bg-emerald-500/5 dark:border-emerald-500/40 dark:bg-emerald-500/10",
				)}
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<h1 className="font-semibold text-2xl tracking-tight">
							{goal.title}
						</h1>
						<p className="text-muted-foreground text-sm">{goal.year}</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2">
						{goal.isComplete ? (
							<Badge className="border-emerald-600/30 bg-emerald-600 text-white dark:bg-emerald-500">
								Complete
							</Badge>
						) : null}
						{goal.isExpired && !goal.isComplete ? (
							<Badge variant="secondary">Expired</Badge>
						) : null}
						{goal.isOwner ? (
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
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

				<p className="text-muted-foreground text-sm">
					{scopeSummary ??
						"All finished reads in this year count toward the target."}
				</p>

				<GoalProgressBar
					current={goal.current}
					target={goal.target}
					isComplete={goal.isComplete}
				/>
			</header>

			<section className="space-y-4">
				<h2 className="font-semibold text-lg">
					Books counted ({goal.books.length})
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
							const bookHref = `/books/${entry.book.slug}` as Route;
							const coverSrc = bookCoverUrl(entry.book.coverId);
							const finishedLabel = formatReadFinishedMonth({
								year: entry.readEndYear,
								month: entry.readEndMonth,
							});

							return (
								<li key={entry.book.slug}>
									<Link
										href={bookHref}
										className="flex gap-4 p-4 transition-colors hover:bg-muted/40"
									>
										<div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="48px"
												/>
											) : (
												<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
													No cover
												</div>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-medium leading-snug">
												{entry.book.title}
											</p>
											<p className="text-muted-foreground text-sm">
												{formatBookAuthors(entry.book.authors)}
											</p>
											<p className="mt-1 text-muted-foreground text-xs">
												Finished {finishedLabel}
											</p>
										</div>
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
