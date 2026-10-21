"use client";

import type { GetUserParticipationListOutput } from "@bbrc/api/modules/user/user.schema";
import { formatSittingSlugLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { BookOpen, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { progressLabels } from "@/components/blocks/sitting-participation-progress";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

type Item = GetUserParticipationListOutput["items"][number];

/** Card tint by the member's progress; only meaningful once reading has begun. */
const progressCardClassName: Record<Item["progress"], string> = {
	not_started: "border-warning/40 bg-warning/5",
	in_progress: "border-primary/40 bg-primary/5",
	completed: "border-success/40 bg-success/5",
	dnf: "border-destructive/40 bg-destructive/5",
};

function VotingProgress({
	poll,
}: {
	poll: NonNullable<Item["sitting"]["poll"]>;
}) {
	const start = poll.createdAt.getTime();
	const end = poll.deadline.getTime();
	const now = Date.now();
	const percent =
		end > start
			? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
			: 100;

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-1.5 border border-border bg-muted/30"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(percent)}
				aria-label="Voting time elapsed"
			>
				<div className="h-full bg-warning" style={{ width: `${percent}%` }} />
			</div>
			<p className="text-muted-foreground text-xs">
				Voting closes {formatDateTime(poll.deadline)} (
				{formatRelativeTime(poll.deadline)})
			</p>
		</div>
	);
}

const shortDate = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
});
const shortDateWithYear = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

function formatShortDate(date: Date, withYear: boolean) {
	return (withYear ? shortDateWithYear : shortDate).format(date);
}

/** Start-to-deadline bar for reading and finished sittings. */
function ReadingTimeline({
	start,
	end,
	finished,
}: {
	start: Date;
	end: Date;
	finished: boolean;
}) {
	const now = Date.now();
	const span = end.getTime() - start.getTime();
	const percent = finished
		? 100
		: span > 0
			? Math.min(100, Math.max(0, ((now - start.getTime()) / span) * 100))
			: 100;
	const overdue = !finished && end.getTime() < now;
	// Show years when the span crosses years or is not in the current year.
	const withYear =
		start.getFullYear() !== end.getFullYear() ||
		end.getFullYear() !== new Date().getFullYear();

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-1.5 border border-border bg-muted/30"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(percent)}
				aria-label="Sitting time elapsed"
			>
				<div
					className={cn(
						"h-full",
						finished
							? "bg-foreground/30"
							: overdue
								? "bg-destructive"
								: "bg-primary",
					)}
					style={{ width: `${percent}%` }}
				/>
			</div>
			<div className="flex items-baseline justify-between gap-2 text-muted-foreground text-xs tabular-nums">
				<span>{formatShortDate(start, withYear)}</span>
				{finished ? null : (
					<span className={cn(overdue && "text-destructive")}>
						Due {formatRelativeTime(end)}
					</span>
				)}
				<span>{formatShortDate(end, withYear)}</span>
			</div>
		</div>
	);
}

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
