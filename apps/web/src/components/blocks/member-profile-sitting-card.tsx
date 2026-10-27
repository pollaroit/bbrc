"use client";

import type { GetUserParticipationListOutput } from "@bbrc/api/modules/user/user.schema";
import { formatSittingSlugLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { BookOpen, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import {
	progressCardClassName,
	ReadingTimeline,
	VotingProgress,
} from "@/components/blocks/sitting-card-parts";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { useProgressLabels } from "@/lib/i18n/use-labels";
import { cn } from "@/lib/utils";

type Item = GetUserParticipationListOutput["items"][number];

type MemberProfileSittingCardProps = {
	item: Item;
	/** Adds dates, readers and page count (sittings tab). */
	variant?: "compact" | "detailed";
};

function VoteButton({ slug }: { slug: string }) {
	return (
		<Button
			size="sm"
			nativeButton={false}
			className="relative z-10"
			render={<Link href={`/sittings/${slug}/vote` as Route} />}
		>
			Open voting
		</Button>
	);
}

export function MemberProfileSittingCard({
	item,
	variant = "compact",
}: MemberProfileSittingCardProps) {
	const progressLabels = useProgressLabels();
	const { sitting } = item;
	const book = sitting.selectedBook;
	const coverSrc = book ? bookCoverUrl(book.coverId) : null;
	const sittingName = formatSittingSlugLabel(sitting.slug);
	const isVoting = sitting.status === "voting";
	const showProgress = !isVoting;

	return (
		<article
			className={cn(
				"relative flex flex-col gap-3 border p-3 transition-colors hover:bg-muted/40",
				showProgress ? progressCardClassName[item.progress] : "border-border",
				sitting.status === "reading" && "border-primary",
			)}
		>
			<div className="flex items-start gap-3">
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
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h3 className="font-medium text-sm leading-snug">
						<Link
							href={`/sittings/${sitting.slug}` as Route}
							className="after:absolute after:inset-0"
						>
							{book ? book.title : sittingName}
						</Link>
						{showProgress ? (
							<span className="sr-only">
								{" "}
								— {progressLabels[item.progress]}
							</span>
						) : null}
					</h3>
					<p className="text-muted-foreground text-sm">
						{book
							? `${formatBookAuthors(book.authors)} • ${sittingName}`
							: "Choosing the next book"}
					</p>
				</div>
			</div>

			{variant === "detailed" && !isVoting && sitting.deadline ? (
				<ReadingTimeline
					start={sitting.createdAt}
					end={sitting.deadline}
					finished={sitting.status === "finished"}
				/>
			) : null}

			{isVoting && sitting.poll ? <VotingProgress poll={sitting.poll} /> : null}

			<div className="flex items-center justify-between gap-2">
				{variant === "detailed" ? (
					<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
						<span className="inline-flex items-center gap-1.5">
							<Users className="size-3.5" aria-hidden />
							{sitting.participantCount}{" "}
							{sitting.participantCount === 1 ? "reader" : "readers"}
						</span>
						{book ? (
							<span className="inline-flex items-center gap-1.5">
								<BookOpen className="size-3.5" aria-hidden />
								{book.pages} pages
							</span>
						) : null}
					</p>
				) : isVoting && item.viewerParticipates ? (
					<VoteButton slug={sitting.slug} />
				) : (
					<span />
				)}
				{isVoting ? (
					variant === "detailed" && item.viewerParticipates ? (
						<VoteButton slug={sitting.slug} />
					) : null
				) : (
					<SittingStatusBadge status={sitting.status} />
				)}
			</div>
		</article>
	);
}
