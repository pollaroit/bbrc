import type {
	PollOption,
	PostPollView,
} from "@bbrc/api/modules/post-poll/post-poll.schema";
import { PENDING_OPTION_PREFIX } from "@/lib/poll/format";

type Contribution = {
	voters: number;
	points: number;
	firstChoices: number;
	rankSum: number;
};

function contributionOf(
	poll: Pick<PostPollView, "type" | "maxChoices">,
	optionIds: readonly string[],
): Map<string, Contribution> {
	const map = new Map<string, Contribution>();
	for (const [index, id] of optionIds.entries()) {
		if (poll.type === "ranking") {
			const rank = index + 1;
			map.set(id, {
				voters: 1,
				points: Math.max(0, poll.maxChoices - rank + 1),
				firstChoices: rank === 1 ? 1 : 0,
				rankSum: rank,
			});
		} else {
			map.set(id, { voters: 1, points: 1, firstChoices: 1, rankSum: 0 });
		}
	}
	return map;
}

function withShares(poll: PostPollView): PostPollView {
	const ranking = poll.type === "ranking";
	const totalPoints = poll.options.reduce(
		(sum, option) => sum + (option.result?.points ?? 0),
		0,
	);
	const totalVoters = poll.totalVoters ?? 0;
	return {
		...poll,
		options: poll.options.map((option) =>
			option.result
				? {
						...option,
						result: {
							...option.result,
							share: ranking
								? totalPoints > 0
									? option.result.points / totalPoints
									: 0
								: totalVoters > 0
									? option.result.voters / totalVoters
									: 0,
						},
					}
				: option,
		),
	};
}

/** The poll as it will look once this ballot replaces the viewer's current one. */
export function withBallot(
	poll: PostPollView,
	optionIds: readonly string[],
): PostPollView {
	const before = contributionOf(poll, poll.viewer.myBallot);
	const after = contributionOf(poll, optionIds);
	const hadBallot = poll.viewer.myBallot.length > 0;
	const hasBallot = optionIds.length > 0;

	const next: PostPollView = {
		...poll,
		totalVoters:
			poll.totalVoters == null
				? null
				: Math.max(
						0,
						poll.totalVoters + (hasBallot ? 1 : 0) - (hadBallot ? 1 : 0),
					),
		viewer: {
			...poll.viewer,
			hasVoted: hasBallot,
			myBallot: [...optionIds],
			canVote: !poll.ended && (poll.allowVoteChange || !hasBallot),
			blockedReason: poll.ended
				? "This poll has ended."
				: hasBallot && !poll.allowVoteChange
					? "Votes cannot be changed on this poll."
					: null,
		},
		options: poll.options.map((option) => {
			if (!option.result) return option;
			const old = before.get(option.id);
			const now = after.get(option.id);
			return {
				...option,
				result: {
					...option.result,
					voters: Math.max(
						0,
						option.result.voters - (old?.voters ?? 0) + (now?.voters ?? 0),
					),
					points: Math.max(
						0,
						option.result.points - (old?.points ?? 0) + (now?.points ?? 0),
					),
					firstChoices: Math.max(
						0,
						option.result.firstChoices -
							(old?.firstChoices ?? 0) +
							(now?.firstChoices ?? 0),
					),
					rankSum: Math.max(
						0,
						option.result.rankSum - (old?.rankSum ?? 0) + (now?.rankSum ?? 0),
					),
				},
			};
		}),
	};
	return withShares(next);
}

export function withoutBallot(poll: PostPollView): PostPollView {
	return withBallot(poll, []);
}

export function withAddedOption(
	poll: PostPollView,
	option: Pick<PollOption, "kind" | "label" | "target">,
	addedBy: { username: string; name: string; image: string | null } | null,
): PostPollView {
	const ownerAdded = poll.viewer.isOwner;
	return {
		...poll,
		viewer: {
			...poll.viewer,
			ownOptionsLeft:
				poll.viewer.ownOptionsLeft == null
					? null
					: Math.max(0, poll.viewer.ownOptionsLeft - 1),
			canAddOption:
				poll.viewer.ownOptionsLeft == null || poll.viewer.ownOptionsLeft > 1,
		},
		options: [
			...poll.options,
			{
				id: `${PENDING_OPTION_PREFIX}${crypto.randomUUID()}`,
				kind: option.kind,
				label: option.label,
				position: poll.options.length,
				userAdded: !ownerAdded,
				addedBy,
				target: option.target,
				canRemove: true,
				result: poll.resultsVisible
					? { voters: 0, share: 0, points: 0, firstChoices: 0, rankSum: 0 }
					: null,
				voters: poll.ballotAccess === "ballots" ? [] : null,
			},
		],
	};
}

export function withoutOption(
	poll: PostPollView,
	optionId: string,
): PostPollView {
	const stripped: PostPollView = {
		...poll,
		viewer: {
			...poll.viewer,
			myBallot: poll.viewer.myBallot.filter((id) => id !== optionId),
		},
		options: poll.options.filter((option) => option.id !== optionId),
	};
	stripped.viewer.hasVoted = stripped.viewer.myBallot.length > 0;
	return poll.resultsVisible ? recount(poll, stripped, optionId) : stripped;
}

/** Removing an option takes its votes with it, so the voter total can shrink. */
function recount(
	before: PostPollView,
	after: PostPollView,
	removedId: string,
): PostPollView {
	const removed = before.options.find((option) => option.id === removedId);
	const lostVoters = removed?.result?.voters ?? 0;
	// A voter is lost only when the removed option was their whole ballot; we
	// cannot know that here, so keep the total and let the server reconcile.
	void lostVoters;
	return withShares(after);
}

export function withClosed(poll: PostPollView): PostPollView {
	return {
		...poll,
		ended: true,
		closedAt: new Date(),
		viewer: {
			...poll.viewer,
			canVote: false,
			blockedReason: "This poll has ended.",
			canAddOption: false,
		},
		options: poll.options.map((option) => ({ ...option, canRemove: false })),
	};
}
