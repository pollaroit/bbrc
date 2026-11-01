import { getMyReadingStats } from "@bbrc/api/modules/reading/reading.service";
import type { Database } from "@bbrc/db";
import {
	resolveClubTimeZone,
	type SessionShareFacts,
	sessionShareFacts,
} from "@bbrc/shared";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { absoluteUrl } from "@/lib/seo/site";

export type SessionStoryContent = {
	title: string;
	authorsLine: string;
	/** Absolute, because the renderer fetches it from the server. */
	coverUrl: string | null;
	/** "Sun 2 November" in the club's time zone. */
	dayLabel: string;
	memberName: string;
	username: string;
	facts: SessionShareFacts;
	/** Days in a row with reading, counting today. */
	streakDays: number;
};

/**
 * What a member's own finished session says, for the picture they share. Only
 * the member can ask for it: nobody else's session ever becomes an image here.
 */
export async function resolveSessionStoryContent(
	sessionId: string,
	db: Database,
	userId: string,
): Promise<SessionStoryContent | null> {
	const row = await db.readingSession.findFirst({
		where: {
			id: sessionId,
			userId,
			endedAt: { not: null },
			readingId: { not: null },
		},
		select: {
			endedAt: true,
			activeSeconds: true,
			mode: true,
			targetMinutes: true,
			pageFrom: true,
			pageTo: true,
			percentFrom: true,
			percentTo: true,
			user: { select: { name: true, username: true } },
			reading: {
				select: {
					book: {
						select: { title: true, authors: true, coverId: true },
					},
				},
			},
		},
	});
	if (!row?.reading || !row.endedAt) return null;

	const timeZone = resolveClubTimeZone();
	const stats = await getMyReadingStats(db, userId);
	const cover = bookCoverUrl(row.reading.book.coverId, "L");

	return {
		title: row.reading.book.title,
		authorsLine: formatBookAuthors(row.reading.book.authors),
		coverUrl: cover
			? cover.startsWith("/")
				? absoluteUrl(cover)
				: cover
			: null,
		dayLabel: new Intl.DateTimeFormat("en-GB", {
			weekday: "short",
			day: "numeric",
			month: "long",
			timeZone,
		}).format(row.endedAt),
		memberName: row.user.name,
		username: row.user.username,
		facts: sessionShareFacts({
			seconds: row.activeSeconds,
			mode: row.mode,
			targetMinutes: row.targetMinutes,
			pageFrom: row.pageFrom,
			pageTo: row.pageTo,
			percentFrom: row.percentFrom,
			percentTo: row.percentTo,
		}),
		streakDays: stats.currentStreak,
	};
}
