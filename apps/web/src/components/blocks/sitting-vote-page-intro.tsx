"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { formatDateTime } from "@/lib/format-datetime";
import { formatPollPageRange } from "@/lib/poll-page-range";
import { orpc } from "@/utils/orpc";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;

type SittingVotePageIntroProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	initialPoll: SittingPoll;
	participantCount: number;
};

export function SittingVotePageIntro({
	sittingSlug,
	sittingStatus,
	initialPoll,
	participantCount,
}: SittingVotePageIntroProps) {
	const { data: sitting } = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sittingSlug }),
	});

	const poll = sitting?.poll ?? initialPoll;
	const status = sitting?.status ?? sittingStatus;
	const participants = sitting?.participants.length ?? participantCount;

	const maxChoices = poll.maxChoices ?? poll.take;
	const totalVotes = poll.options.reduce(
		(sum, option) => sum + option.voteCount,
		0,
	);
	const isOpen = status === "voting";

	return (
		<header className="flex flex-col gap-5 border border-border bg-card p-4 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex max-w-prose flex-col gap-2">
					<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
						{isOpen ? "Choose the club read" : "Voting results"}
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{isOpen
							? `Pick ${poll.minChoices === maxChoices ? maxChoices : `${poll.minChoices} to ${maxChoices}`} wishlist books you would like the club to read. Poll options favor titles fewer participants have finished already.`
							: "Final vote totals from this sitting's poll. The club pick is marked on the winning option."}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={isOpen ? "default" : "outline"}>
						{isOpen ? "Voting open" : "Voting closed"}
					</Badge>
					<ResourceShareMenu
						path={`/sittings/${sittingSlug}/vote`}
						shareText={
							isOpen
								? `Vote on books for ${sittingSlug.replaceAll("_", " ")}`
								: `Voting results · ${sittingSlug.replaceAll("_", " ")}`
						}
						label="Share poll"
						shareInPost={{ kind: "sitting", slug: sittingSlug }}
						size="md"
					/>
				</div>
			</div>

			<dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">
						{isOpen ? "Closes" : "Closed"}
					</dt>
					<dd className="font-medium text-sm leading-snug">
						{formatDateTime(poll.deadline)}
					</dd>
				</div>
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">Your ballot</dt>
					<dd className="font-medium text-sm tabular-nums">
						{poll.minChoices}–{maxChoices} books
					</dd>
				</div>
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">Page range</dt>
					<dd className="font-medium text-sm tabular-nums">
						{formatPollPageRange(poll.minPages, poll.maxPages)}
					</dd>
				</div>
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">Participants</dt>
					<dd className="font-medium text-sm tabular-nums">{participants}</dd>
				</div>
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">Ballots cast</dt>
					<dd className="font-medium text-sm tabular-nums">
						{poll.voterCount}
					</dd>
				</div>
				<div className="border border-border bg-muted/20 px-3 py-2.5">
					<dt className="text-muted-foreground text-xs">Total selections</dt>
					<dd className="font-medium text-sm tabular-nums">{totalVotes}</dd>
				</div>
			</dl>
		</header>
	);
}
