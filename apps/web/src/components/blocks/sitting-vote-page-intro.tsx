"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { useState } from "react";
import { PollConfigurationDialog } from "@/components/blocks/poll-configuration-dialog";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { authClient } from "@/lib/auth-client";
import { formatClubDateTime } from "@/lib/club-timezone";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;

type SittingVotePageIntroProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	initialPoll: SittingPoll;
	participantCount: number;
	selectedBookSlug: string | null;
};

function ChipTag({
	label,
	points,
	tone,
}: {
	label: string;
	points: number;
	tone: "gold" | "silver";
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 border px-2 py-1 text-xs",
				tone === "gold"
					? "border-amber-600/60 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/60 dark:text-amber-50"
					: "border-slate-500/60 bg-slate-200 text-slate-900 dark:border-slate-400/50 dark:bg-slate-800 dark:text-slate-100",
			)}
		>
			{label}
			<span className="tabular-nums">· {points} pts</span>
		</span>
	);
}

export function SittingVotePageIntro({
	sittingSlug,
	sittingStatus,
	initialPoll,
	participantCount,
	selectedBookSlug,
}: SittingVotePageIntroProps) {
	const [configOpen, setConfigOpen] = useState(false);
	const { data: session } = authClient.useSession();

	const { data: sitting } = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sittingSlug }),
	});

	const poll = sitting?.poll ?? initialPoll;
	const status = sitting?.status ?? sittingStatus;
	const participants = sitting?.participants ?? [];
	const participantTotal = sitting?.participants.length ?? participantCount;
	const maxChoices = poll.maxChoices ?? poll.take;
	const isOpen = status === "voting";
	const isAdmin = session?.user.isAdmin === true;
	const isParticipant =
		Boolean(session?.user) &&
		participants.some((person) => person.userId === session?.user.id);
	const hasVoted = poll.myVoteOptionIds.length > 0;
	const grants = poll.myChipGrants;

	const ballotLabel =
		poll.minChoices === maxChoices
			? `${maxChoices} ${maxChoices === 1 ? "book" : "books"}`
			: `${poll.minChoices} to ${maxChoices} books`;

	const winner =
		selectedBookSlug != null
			? poll.options.find((option) => option.book.slug === selectedBookSlug)
			: undefined;
	const totalPoints = poll.options.reduce(
		(sum, option) => sum + option.pointTotal,
		0,
	);

	return (
		<>
			<header className="flex flex-col gap-4 border border-border p-4 sm:p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-1">
						<h1 className="font-semibold text-xl tracking-tight sm:text-2xl">
							{isOpen ? "Pick the next club read" : "Voting results"}
						</h1>
						<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
							{isOpen
								? `Choose ${ballotLabel} from ${poll.options.length} books. Closes ${formatClubDateTime(poll.deadline)}.`
								: `Voting closed ${formatClubDateTime(poll.deadline)}. ${poll.voterCount} ${poll.voterCount === 1 ? "ballot" : "ballots"} counted.`}
						</p>
					</div>
					<div className="flex shrink-0 divide-x divide-border border border-border">
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
							iconOnly
							triggerClassName="size-8 px-0 text-foreground"
						/>
					</div>
				</div>

				{isOpen && isParticipant ? (
					<div className="flex flex-col gap-3 border-border border-t pt-4">
						<p className="flex items-center gap-2 text-sm">
							{hasVoted ? (
								<CheckCircle2 className="size-4 text-success" aria-hidden />
							) : (
								<Circle className="size-4 text-muted-foreground" aria-hidden />
							)}
							{hasVoted
								? `Your ballot is saved (${poll.myVoteOptionIds.length} ${poll.myVoteOptionIds.length === 1 ? "book" : "books"}). You can change it until voting closes.`
								: "You haven't voted yet."}
						</p>
						{grants.canUseGolden || grants.canUseSilver ? (
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-muted-foreground text-xs">
									Your chips
								</span>
								{grants.canUseGolden ? (
									<ChipTag label="Golden" points={3} tone="gold" />
								) : null}
								{grants.canUseSilver ? (
									<ChipTag label="Silver" points={2} tone="silver" />
								) : null}
								<span className="text-muted-foreground text-xs">
									One of each, on any book you pick.
								</span>
							</div>
						) : null}
					</div>
				) : null}

				{isOpen && !isParticipant ? (
					<p className="border-border border-t pt-4 text-muted-foreground text-sm">
						{session?.user
							? "Only readers in this sitting can vote."
							: "Sign in as a participant to vote."}
					</p>
				) : null}

				{!isOpen && winner ? (
					<div className="flex items-start gap-3 border-border border-t pt-4">
						<Trophy
							className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
							aria-hidden
						/>
						<div className="min-w-0">
							<p className="font-medium text-sm">{winner.book.title}</p>
							<p className="text-muted-foreground text-xs tabular-nums">
								Club pick · {winner.pointTotal} pts from {winner.voteCount}{" "}
								{winner.voteCount === 1 ? "voter" : "voters"} · {totalPoints}{" "}
								points in total
							</p>
						</div>
					</div>
				) : null}

				<div className="flex flex-wrap items-center justify-between gap-2 border-border border-t pt-3">
					<p className="text-muted-foreground text-xs">
						{isOpen
							? `${poll.voterCount} of ${participantTotal} readers have voted.${isAdmin ? "" : " Totals stay hidden until voting ends."}`
							: `${participantTotal} readers took part.`}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							setConfigOpen(true);
						}}
					>
						Poll rules
					</Button>
				</div>
			</header>

			<PollConfigurationDialog
				poll={poll}
				open={configOpen}
				onOpenChange={setConfigOpen}
			/>
		</>
	);
}
