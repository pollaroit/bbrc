import type { Database } from "@bbrc/db";

/** Active members of a sitting (not soft-removed). */
export const activeParticipationWhere = {
	removedAt: null,
} as const;

export async function countActiveParticipantsForSitting(
	db: Database,
	sittingId: string,
): Promise<number> {
	return db.participation.count({
		where: { sittingId, ...activeParticipationWhere },
	});
}
