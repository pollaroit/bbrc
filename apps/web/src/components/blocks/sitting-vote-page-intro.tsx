import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { formatDateTime } from "@/lib/format-datetime";

type SittingVotePageIntroProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingVotePageIntro({ sitting }: SittingVotePageIntroProps) {
	const poll = sitting.poll;
	if (!poll) {
		return null;
	}

	const maxChoices = poll.maxChoices ?? poll.take;
	const totalVotes = poll.options.reduce(
		(sum, option) => sum + option.voteCount,
		0,
	);
	const isOpen = sitting.status === "voting";

	return (
		<header className="flex flex-col gap-4 border border-border bg-muted/30 p-4 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<h2 className="font-semibold text-xl tracking-tight sm:text-2xl">
						{isOpen ? "Choose the club read" : "Voting results"}
					</h2>
					<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
						{isOpen
							? `Select between ${poll.minChoices} and ${maxChoices} wishlist books. You can change your picks until the poll closes.`
							: "Final vote totals from this sitting's poll. The club pick is marked below."}
					</p>
				</div>
				<Badge variant={isOpen ? "default" : "outline"}>
					{isOpen ? "Voting open" : "Voting closed"}
				</Badge>
			</div>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<div className="border border-border/60 bg-background/80 px-3 py-2">
					<dt className="text-muted-foreground text-xs">
						{isOpen ? "Closes" : "Closed"}
					</dt>
					<dd className="font-medium text-sm">
						{formatDateTime(poll.deadline)}
					</dd>
				</div>
				<div className="border border-border/60 bg-background/80 px-3 py-2">
					<dt className="text-muted-foreground text-xs">Choices allowed</dt>
					<dd className="font-medium text-sm tabular-nums">
						{poll.minChoices}–{maxChoices}
					</dd>
				</div>
				<div className="border border-border/60 bg-background/80 px-3 py-2">
					<dt className="text-muted-foreground text-xs">Page range</dt>
					<dd className="font-medium text-sm tabular-nums">
						{poll.minPages ?? "—"} – {poll.maxPages ?? "—"}
					</dd>
				</div>
				<div className="border border-border/60 bg-background/80 px-3 py-2">
					<dt className="text-muted-foreground text-xs">Total votes</dt>
					<dd className="font-medium text-sm tabular-nums">{totalVotes}</dd>
				</div>
				<div className="border border-border/60 bg-background/80 px-3 py-2">
					<dt className="text-muted-foreground text-xs">Total voters</dt>
					<dd className="font-medium text-sm tabular-nums">
						{poll.voterCount}
					</dd>
				</div>
			</dl>
		</header>
	);
}
