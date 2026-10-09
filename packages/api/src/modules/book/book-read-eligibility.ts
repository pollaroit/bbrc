import type { Database } from "@bbrc/db";
import { userHasReadBook } from "../read/read.service";
import { activeParticipationWhere } from "../sitting/participation-active";

/** Joined a sitting that selected this book (reading or finished). */
export async function userParticipatedClubRead(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	const participation = await db.participation.findFirst({
		where: {
			userId,
			...activeParticipationWhere,
			sitting: {
				selectedBookId: bookId,
				status: { in: ["reading", "finished"] },
			},
		},
		select: { id: true },
	});

	return participation != null;
}

/** Member has marked this book read (personal library). */
export async function userCompletedClubRead(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	return userHasReadBook(userId, bookId, db);
}

export async function clubReadEligibilityHint(
	userId: string,
	bookId: string,
	db: Database,
): Promise<string> {
	const hasRead = await userHasReadBook(userId, bookId, db);
	if (hasRead) {
		return "You cannot favorite this book right now.";
	}

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
		return "Mark this book as read on its page, or finish it on a sitting that chose this book.";
	}

	if (participation.progress !== "completed") {
		return "Mark yourself as completed on that sitting's page, or mark the book read on its page.";
	}

	return "You cannot favorite this book right now.";
}
