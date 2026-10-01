import type { Database } from "@bbrc/db";
import { activeParticipationWhere } from "../sitting/participation-active";

/** Completed this book as the club read (reading or finished sitting). */
export async function userCompletedClubRead(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	const participation = await db.participation.findFirst({
		where: {
			userId,
			...activeParticipationWhere,
			progress: "completed",
			sitting: {
				selectedBookId: bookId,
				status: { in: ["reading", "finished"] },
			},
		},
		select: { id: true },
	});

	return participation != null;
}

export async function clubReadEligibilityHint(
	userId: string,
	bookId: string,
	db: Database,
): Promise<string> {
	const participation = await db.participation.findFirst({
		where: {
			userId,
			...activeParticipationWhere,
			sitting: {
				selectedBookId: bookId,
				status: { in: ["reading", "finished"] },
			},
		},
		select: { progress: true },
	});

	if (!participation) {
		return "Only participants of a sitting that chose this book can use this after finishing the read.";
	}

	if (participation.progress !== "completed") {
		return "Mark yourself as completed on that sitting's page first.";
	}

	return "You cannot favorite this book right now.";
}
