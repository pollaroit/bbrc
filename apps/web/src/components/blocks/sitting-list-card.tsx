"use client";

import type { GetSittingListOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { formatSittingSlugLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { BookOpen, CheckCheck, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import {
	progressCardClassName,
	ReadingTimeline,
	VotingProgress,
} from "@/components/blocks/sitting-card-parts";
import { progressLabels } from "@/components/blocks/sitting-participation-progress";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type Sitting = GetSittingListOutput["items"][number];

export function SittingListCard({ sitting }: { sitting: Sitting }) {
	const book = sitting.selectedBook;
	const coverSrc = book ? bookCoverUrl(book.coverId) : null;
	const sittingName = formatSittingSlugLabel(sitting.slug);
	const isVoting = sitting.status === "voting";
	const viewerProgress = sitting.viewerProgress;
	const showViewerTint = !isVoting && viewerProgress != null;

	return (
		<article
			className={cn(
				"relative flex h-full flex-col gap-3 border p-3 transition-colors hover:bg-muted/40",
				showViewerTint
					? progressCardClassName[viewerProgress]
					: "border-border",
				sitting.status === "reading" && "border-primary",
			)}
		>
			<div className="flex items-start gap-3">
				<span className="relative block aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
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
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h2 className="font-medium text-sm leading-snug">
						<Link
							href={`/sittings/${sitting.slug}` as Route}
							className="after:absolute after:inset-0"
						>
							{book ? book.title : sittingName}
						</Link>
						{showViewerTint ? (
							<span className="sr-only">
								{" "}
								— your status: {progressLabels[viewerProgress]}
							</span>
						) : null}
					</h2>
					<p className="text-muted-foreground text-sm">
						{book
							? `${formatBookAuthors(book.authors)} • ${sittingName}`
							: "Choosing the next book"}
					</p>
				</div>
			</div>

			{isVoting && sitting.poll ? <VotingProgress poll={sitting.poll} /> : null}
			{!isVoting && sitting.deadline ? (
				<ReadingTimeline
					start={sitting.createdAt}
					end={sitting.deadline}
					finished={sitting.status === "finished"}
				/>
			) : null}

			<div className="mt-auto flex items-end justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
						<span className="inline-flex items-center gap-1.5">
							<Users className="size-3.5" aria-hidden />
							{sitting.participantCount}{" "}
							{sitting.participantCount === 1 ? "reader" : "readers"}
						</span>
						{!isVoting ? (
							<span
								className="inline-flex items-center gap-1.5"
								title="Readers who completed the book"
							>
								<CheckCheck className="size-3.5" aria-hidden />
								{sitting.completedCount} done
							</span>
						) : null}
						{book ? (
							<span className="inline-flex items-center gap-1.5">
								<BookOpen className="size-3.5" aria-hidden />
								{book.pages} pages
							</span>
						) : null}
					</p>
					{showViewerTint ? (
						<p className="text-xs">You: {progressLabels[viewerProgress]}</p>
					) : null}
				</div>
				{isVoting ? (
					viewerProgress != null ? (
						<Button
							size="sm"
							nativeButton={false}
							className="relative z-10"
							render={<Link href={`/sittings/${sitting.slug}/vote` as Route} />}
						>
							Open voting
						</Button>
					) : null
				) : (
					<SittingStatusBadge status={sitting.status} />
				)}
			</div>
		</article>
	);
}
