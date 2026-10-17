export type PollChipGrantFlags = {
	canUseGolden: boolean;
	canUseSilver: boolean;
};

export type PollChipGrantParticipant = {
	userId: string;
	rp: number;
};

/**
 * RP-based chip eligibility at voting start (see NEW_VOTING.md).
 */
export function computePollChipGrants(
	participants: PollChipGrantParticipant[],
): Map<string, PollChipGrantFlags> {
	const grants = new Map<string, PollChipGrantFlags>();

	if (participants.length === 0) {
		return grants;
	}

	const distinctRps = [
		...new Set(participants.map((participant) => participant.rp)),
	].toSorted((a, b) => b - a);

	const maxRp = distinctRps[0];
	const secondRp = distinctRps.length > 1 ? distinctRps[1] : null;

	for (const participant of participants) {
		if (participant.rp === maxRp) {
			grants.set(participant.userId, {
				canUseGolden: true,
				canUseSilver: true,
			});
			continue;
		}

		if (secondRp != null && participant.rp === secondRp) {
			grants.set(participant.userId, {
				canUseGolden: false,
				canUseSilver: true,
			});
			continue;
		}

		grants.set(participant.userId, {
			canUseGolden: false,
			canUseSilver: false,
		});
	}

	return grants;
}

/** Chip tier for poll voting (null = no bonus chips). */
export function pollChipRankFromGrants(
	grants: PollChipGrantFlags,
): 1 | 2 | null {
	if (grants.canUseGolden) {
		return 1;
	}

	if (grants.canUseSilver) {
		return 2;
	}

	return null;
}

export {
	type PollVoteSubmission,
	validatePollVoteSubmission,
} from "./vote-validation";
