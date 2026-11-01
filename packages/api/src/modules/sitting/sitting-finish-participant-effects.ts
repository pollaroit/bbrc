import type { DatabaseTransaction } from "@bbrc/db";
import { calculateRpPointsDelta } from "../rp/rp.service";
import {
	type ParticipationProgress,
	progressEarnsPoints,
} from "./participation-progress";

type FinishedSittingParticipant = {
	userId: string;
	progress: ParticipationProgress;
};

/**
 * Applies RP events and the RP balance when a sitting finishes: members who
 * completed the book or did not finish it are scored. One update per affected
 * member. Nothing here touches who a member is or what they may do.
 */
export async function applyFinishedSittingParticipantEffects(
	input: { sittingId: string; bookPages: number },
	participants: FinishedSittingParticipant[],
	db: DatabaseTransaction,
): Promise<void> {
	const existing = await db.rPEvent.findFirst({
		where: { sittingId: input.sittingId },
		select: { id: true },
	});

	if (existing) {
		return;
	}

	const eventRows: { userId: string; sittingId: string; points: number }[] = [];
	const rpByUserId = new Map<string, number>();

	for (const participant of participants) {
		if (!progressEarnsPoints(participant.progress)) {
			continue;
		}

		const points = calculateRpPointsDelta(
			participant.progress,
			input.bookPages,
		);

		if (points === 0) {
			continue;
		}

		eventRows.push({
			userId: participant.userId,
			sittingId: input.sittingId,
			points,
		});
		rpByUserId.set(
			participant.userId,
			(rpByUserId.get(participant.userId) ?? 0) + points,
		);
	}

	if (eventRows.length > 0) {
		await db.rPEvent.createMany({ data: eventRows });
	}

	for (const [userId, increment] of rpByUserId) {
		await db.user.update({
			where: { id: userId },
			data: { rp: { increment } },
		});
	}
}
