import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { formatSittingSlugLabel } from "@bbrc/shared";
import { BookOpen, CalendarClock, CheckCheck, Users } from "lucide-react";
import Image from "next/image";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SittingAdminPanel } from "@/components/blocks/sitting-admin-panel";
import { SittingHubNav } from "@/components/blocks/sitting-hub-nav";
import { SittingJoinControls } from "@/components/blocks/sitting-join-controls";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { SittingViewerAction } from "@/components/blocks/sitting-viewer-action";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";

type SittingShellProps = {
	sitting: GetSittingBySlugOutput;
	children: React.ReactNode;
};

function Fact({
	icon,
	label,
	sub,
	children,
}: {
	icon: React.ReactNode;
	label: string;
	sub?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1 px-3 py-3 sm:px-4">
			<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
				{icon}
				{label}
			</span>
			<span className="font-medium text-sm tabular-nums leading-tight sm:text-base">
				{children}
			</span>
			{sub ? (
				<span className="text-muted-foreground text-xs leading-snug">
					{sub}
				</span>
			) : null}
		</div>
	);
}

export function SittingShell({ sitting, children }: SittingShellProps) {
	const book = sitting.selectedBook;
	const sittingName = formatSittingSlugLabel(sitting.slug);
	const coverSrc = book ? bookCoverUrl(book.coverId, "M") : null;
	const isVoting = sitting.status === "voting";
	const { stats } = sitting;

	const closesAt = isVoting
		? (sitting.poll?.deadline ?? sitting.deadline)
		: sitting.deadline;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-5">
				<div className="flex items-start gap-4">
					<div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-32">
						{coverSrc ? (
							<Image
								src={coverSrc}
								alt=""
								fill
								priority
								className="object-cover"
								sizes="128px"
							/>
						) : (
							<span className="flex size-full items-center justify-center text-muted-foreground">
								<BookOpen className="size-6" aria-hidden />
							</span>
						)}
					</div>

					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<h1 className="font-semibold text-xl tracking-tight sm:text-3xl">
									{book ? book.title : sittingName}
								</h1>
								<p className="mt-0.5 text-muted-foreground text-sm">
									{book
										? `${formatBookAuthors(book.authors)} • ${sittingName}`
										: "Choosing the next book"}
								</p>
							</div>
							<div className="flex shrink-0 border border-border">
								<ResourceShareMenu
									path={`/sittings/${sitting.slug}`}
									shareText={sitting.displayName}
									label="Share sitting"
									shareInPost={{ kind: "sitting", slug: sitting.slug }}
									storyBookSlug={book?.slug}
									size="md"
									iconOnly
									triggerClassName="size-8 px-0 text-foreground"
								/>
							</div>
						</div>

						<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
							<SittingStatusBadge status={sitting.status} />
							<span className="text-muted-foreground">
								{isVoting ? (
									<>
										Voting closes <RelativeTime date={closesAt} />
									</>
								) : sitting.status === "reading" ? (
									<>
										Reading ends <RelativeTime date={closesAt} />
									</>
								) : (
									<>
										Ended <ClubDateTime value={closesAt} />
									</>
								)}
							</span>
						</p>
					</div>
				</div>

				<SittingJoinControls
					sittingSlug={sitting.slug}
					status={sitting.status}
					deadline={closesAt}
				/>

				<SittingViewerAction
					sittingSlug={sitting.slug}
					status={sitting.status}
					bookSlug={book?.slug ?? null}
					bookTitle={book?.title ?? null}
				/>

				<div className="grid grid-cols-2 divide-x divide-y divide-border border border-border sm:grid-cols-4 sm:divide-y-0">
					<Fact
						icon={<Users className="size-3.5" aria-hidden />}
						label="Readers"
					>
						{stats.participantCount}
					</Fact>
					<Fact
						icon={<CheckCheck className="size-3.5" aria-hidden />}
						label="Finished"
					>
						{isVoting
							? "—"
							: `${stats.progressCounts.completed} of ${stats.participantCount}`}
					</Fact>
					<Fact
						icon={<BookOpen className="size-3.5" aria-hidden />}
						label="Pages"
					>
						{book ? book.pages : "—"}
					</Fact>
					<Fact
						icon={<CalendarClock className="size-3.5" aria-hidden />}
						sub={
							!isVoting && sitting.poll ? (
								<>
									Voting closed <ClubDateTime value={sitting.poll.deadline} />
								</>
							) : undefined
						}
						label={
							isVoting
								? "Voting closes"
								: sitting.status === "finished"
									? "Ended"
									: "Deadline"
						}
					>
						<ClubDateTime value={closesAt} />
					</Fact>
				</div>

				<SittingAdminPanel sitting={sitting} />
			</header>

			<SittingHubNav sitting={sitting} />

			{children}
		</div>
	);
}
