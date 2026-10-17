export type PollVoteSubmission = {
	optionId: string;
	points: 1 | 2 | 3;
};

export function validatePollVoteSubmission(input: {
	votes: PollVoteSubmission[];
	grants: { canUseGolden: boolean; canUseSilver: boolean };
	minChoices: number;
	maxChoices: number;
	allowedOptionIds: ReadonlySet<string>;
}): { ok: true } | { ok: false; message: string } {
	const { votes, grants, minChoices, maxChoices, allowedOptionIds } = input;

	if (votes.length !== new Set(votes.map((vote) => vote.optionId)).size) {
		return { ok: false, message: "Duplicate poll options are not allowed" };
	}

	for (const vote of votes) {
		if (!allowedOptionIds.has(vote.optionId)) {
			return {
				ok: false,
				message: "One or more selected options are not on this poll",
			};
		}
	}

	if (votes.length < minChoices) {
		return {
			ok: false,
			message: `Select at least ${minChoices} ${minChoices === 1 ? "book" : "books"}`,
		};
	}

	if (votes.length > maxChoices) {
		return {
			ok: false,
			message: `Select at most ${maxChoices} ${maxChoices === 1 ? "book" : "books"}`,
		};
	}

	let goldenCount = 0;
	let silverCount = 0;

	for (const vote of votes) {
		if (vote.points === 3) {
			goldenCount += 1;
			if (!grants.canUseGolden) {
				return {
					ok: false,
					message: "You cannot use a Golden chip on this poll",
				};
			}
		} else if (vote.points === 2) {
			silverCount += 1;
			if (!grants.canUseSilver) {
				return {
					ok: false,
					message: "You cannot use a Silver chip on this poll",
				};
			}
		} else if (vote.points !== 1) {
			return { ok: false, message: "Invalid vote points" };
		}
	}

	if (goldenCount > 1) {
		return {
			ok: false,
			message: "You can use at most one Golden chip",
		};
	}

	if (silverCount > 1) {
		return {
			ok: false,
			message: "You can use at most one Silver chip",
		};
	}

	return { ok: true };
}
