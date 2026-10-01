import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-datetime";

type SittingVotePromptProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingVotePrompt({ sitting }: SittingVotePromptProps) {
	if (sitting.status !== "voting" || !sitting.poll) {
		return null;
	}

	const poll = sitting.poll;
	const maxChoices = poll.maxChoices ?? poll.take;
	const optionCount = poll.options.length;
	const totalVotes = poll.options.reduce(
		(sum, option) => sum + option.voteCount,
		0,
	);
	const voteHref = `/sittings/${sitting.slug}/vote` as Route;

	return (
		<Card className="border-primary/25 bg-primary/5">
			<CardHeader className="gap-1">
				<CardTitle className="text-base">Book poll is open</CardTitle>
				<CardDescription>
					Rank {poll.minChoices} to {maxChoices} wishlist titles before{" "}
					{formatDateTime(poll.deadline)}.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
					<div>
						<dt className="text-muted-foreground text-xs">Options</dt>
						<dd className="font-medium tabular-nums">{optionCount}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Votes cast</dt>
						<dd className="font-medium tabular-nums">{totalVotes}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Your picks</dt>
						<dd className="font-medium tabular-nums">
							{poll.myVoteOptionIds.length > 0
								? `${poll.myVoteOptionIds.length} saved`
								: "Not yet"}
						</dd>
					</div>
				</dl>
				<Button render={<Link href={voteHref} />} nativeButton={false}>
					Vote in poll
					<ArrowRight data-icon="inline-end" />
				</Button>
			</CardContent>
		</Card>
	);
}
