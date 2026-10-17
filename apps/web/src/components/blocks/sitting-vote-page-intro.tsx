"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { PollConfigurationDialog } from "@/components/blocks/poll-configuration-dialog";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;

type SittingVotePageIntroProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	initialPoll: SittingPoll;
	participantCount: number;
};

function IntroStat({
	label,
	value,
	className,
}: {
	label: string;
	value: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`border border-border bg-muted/15 px-3 py-2.5 ${className ?? ""}`}
		>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-0.5 font-medium text-sm tabular-nums leading-snug">
				{value}
			</dd>
		</div>
	);
}

export function SittingVotePageIntro({
	sittingSlug,
	sittingStatus,
	initialPoll,
	participantCount,
}: SittingVotePageIntroProps) {
	const [configOpen, setConfigOpen] = useState(false);
	const { data: session } = authClient.useSession();

	const { data: sitting } = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sittingSlug }),
	});

	const poll = sitting?.poll ?? initialPoll;
	const status = sitting?.status ?? sittingStatus;
	const participants = sitting?.participants.length ?? participantCount;

	const maxChoices = poll.maxChoices ?? poll.take;
	const isOpen = status === "voting";
	const isAdmin = session?.user.isAdmin === true;
	const showLiveTotals = !isOpen || isAdmin;
	const totalPoints = poll.options.reduce(
		(sum, option) => sum + option.pointTotal,
		0,
	);
	const ballotLabel =
		poll.minChoices === maxChoices
			? `${maxChoices} book${maxChoices === 1 ? "" : "s"}`
			: `${poll.minChoices}–${maxChoices} books`;

	return (
		<>
			<header className="flex flex-col border border-border bg-card">
				<div className="flex flex-col gap-5 p-4 sm:p-6">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex max-w-prose flex-col gap-2">
							<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
								{isOpen ? "Choose the club read" : "Voting results"}
							</h1>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{isOpen
									? "Rank wishlist books you want the club to read. Options favor titles fewer participants have finished."
									: "Final totals from this poll. The club pick is marked on the winning book."}
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

					<dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
						<IntroStat
							label={isOpen ? "Closes" : "Closed"}
							value={formatDateTime(poll.deadline)}
						/>
						<IntroStat label="Your ballot" value={ballotLabel} />
						<IntroStat
							label="Participants"
							value={participants}
							className="col-span-2 lg:col-span-1"
						/>
						{showLiveTotals ? (
							<div className="col-span-2 border border-border bg-muted/15 lg:col-span-1">
								<div className="grid h-full min-h-[3.25rem] grid-cols-2 divide-x divide-border">
									<div className="px-3 py-2.5">
										<p className="text-muted-foreground text-xs">
											Ballots cast
										</p>
										<p className="mt-0.5 font-medium text-sm tabular-nums">
											{poll.voterCount}
										</p>
									</div>
									<div className="px-3 py-2.5">
										<p className="text-muted-foreground text-xs">
											Total points
										</p>
										<p className="mt-0.5 font-medium text-sm tabular-nums">
											{totalPoints}
										</p>
									</div>
								</div>
							</div>
						) : (
							<IntroStat
								label="Live totals"
								value="Hidden until voting ends"
								className="col-span-2 lg:col-span-1"
							/>
						)}
					</dl>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-border border-t bg-muted/10 px-4 py-3 sm:px-6">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							setConfigOpen(true);
						}}
					>
						See configuration
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
