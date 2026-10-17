import type { DatabaseTransaction } from "@bbrc/db";
import { computePollChipGrants, type PollChipGrantFlags } from "@bbrc/shared";

export async function insertPollChipGrantsForParticipants(
	pollId: string,
	participantUserIds: string[],
	tx: DatabaseTransaction,
): Promise<void> {
	if (participantUserIds.length === 0) {
		return;
	}

	const users = await tx.user.findMany({
		where: { id: { in: participantUserIds } },
		select: { id: true, rp: true },
	});

	const grants = computePollChipGrants(
		users.map((user) => ({ userId: user.id, rp: user.rp })),
	);

	await tx.pollChipGrant.createMany({
		data: participantUserIds.map((userId) => {
			const flags: PollChipGrantFlags = grants.get(userId) ?? {
				canUseGolden: false,
				canUseSilver: false,
			};

			return {
				pollId,
				userId,
				canUseGolden: flags.canUseGolden,
				canUseSilver: flags.canUseSilver,
			};
		}),
	});
}
