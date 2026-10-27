import type { Database } from "@bbrc/db";
import { createServerTranslator } from "@bbrc/i18n";
import type { ErrorKey } from "../../lib/app-error";
import { currentLocale } from "../../lib/request-locale";
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

/** Why the member cannot favorite this book yet, as an error key. */
export async function clubReadEligibilityKey(
	userId: string,
	bookId: string,
	db: Database,
): Promise<ErrorKey> {
	const hasRead = await userHasReadBook(userId, bookId, db);
	if (hasRead) {
		return "book.eligibility.cannotFavorite";
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
		return "book.eligibility.markRead";
	}

	if (participation.progress !== "completed") {
		return "book.eligibility.markCompleted";
	}

	return "book.eligibility.cannotFavorite";
}

/** The same reason as a sentence in the language of the request. */
export async function clubReadEligibilityHint(
	userId: string,
	bookId: string,
	db: Database,
): Promise<string> {
	const key = await clubReadEligibilityKey(userId, bookId, db);
	const translate = createServerTranslator(currentLocale(), "errors") as (
		key: string,
	) => string;
	return translate(key);
}
