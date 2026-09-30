import type { DatabaseTransaction } from "@bbrc/db";
import { calculateRpPointsDelta } from "../rp/rp.service";
import {
	type ParticipationProgress,
	progressAffectsUserStatus,
} from "./participation-progress";
import { nextUserStatusAfterParticipationProgress } from "./sitting-user-status";

type FinishedSittingParticipant = {
	userId: string;
	progress: ParticipationProgress;
};

/**
 * Applies RP events and user status/RP balance updates when a sitting finishes.
 * One user load and one user update per affected member (combined status + RP).
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

	const affecting = participants.flatMap((participant) =>
		progressAffectsUserStatus(participant.progress)
			? [
					{
						userId: participant.userId,
						progress: participant.progress,
					},
				]
			: [],
	);

	if (affecting.length === 0) {
		return;
	}

	const userIds = [...new Set(affecting.map((row) => row.userId))];

	const users = await db.user.findMany({
		where: { id: { in: userIds } },
		select: { id: true, status: true },
	});

	const statusByUserId = new Map(users.map((user) => [user.id, user.status]));

	const eventRows: { userId: string; sittingId: string; points: number }[] = [];
	const userPatches = new Map<
		string,
		{ status?: (typeof users)[number]["status"]; rpIncrement: number }
	>();

	for (const participant of affecting) {
		const currentStatus = statusByUserId.get(participant.userId);

		if (currentStatus) {
			const nextStatus = nextUserStatusAfterParticipationProgress(
				currentStatus,
				participant.progress,
			);

			if (nextStatus !== currentStatus) {
				statusByUserId.set(participant.userId, nextStatus);
				const patch = userPatches.get(participant.userId) ?? { rpIncrement: 0 };
				patch.status = nextStatus;
				userPatches.set(participant.userId, patch);
			}
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

		const patch = userPatches.get(participant.userId) ?? { rpIncrement: 0 };
		patch.rpIncrement += points;
		userPatches.set(participant.userId, patch);
	}

	if (eventRows.length > 0) {
		await db.rPEvent.createMany({ data: eventRows });
	}

	for (const [userId, patch] of userPatches) {
		const data: {
			status?: (typeof users)[number]["status"];
			rp?: { increment: number };
		} = {};

		if (patch.status !== undefined) {
			data.status = patch.status;
		}

		if (patch.rpIncrement !== 0) {
			data.rp = { increment: patch.rpIncrement };
		}

		if (Object.keys(data).length === 0) {
			continue;
		}

		await db.user.update({
			where: { id: userId },
			data,
		});
	}
}
