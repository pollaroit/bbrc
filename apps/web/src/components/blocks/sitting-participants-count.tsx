import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { Route } from "next";
import Link from "next/link";

type SittingParticipantsCountProps = {
	count: number;
	sitting: GetSittingBySlugOutput;
};

export function SittingParticipantsCount({
	count,
	sitting,
}: SittingParticipantsCountProps) {
	const poll = sitting.poll;
	const showVoteLink =
		(sitting.status === "reading" || sitting.status === "finished") &&
		poll != null;
	const participantsHref = `/sittings/${sitting.slug}/participants` as Route;
	const voteHref = `/sittings/${sitting.slug}/vote` as Route;

	return (
		<div>
			<dt className="text-muted-foreground text-xs">Participants</dt>
			<dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium tabular-nums">
				<span>{count}</span>
				<Link
					href={participantsHref}
					className="font-normal text-primary text-sm underline-offset-4 hover:underline"
				>
					View roster
				</Link>
				{showVoteLink ? (
					<Link
						href={voteHref}
						className="font-normal text-primary text-sm underline-offset-4 hover:underline"
					>
						Voting results
					</Link>
				) : null}
			</dd>
		</div>
	);
}
