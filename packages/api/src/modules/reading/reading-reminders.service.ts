import type { Database } from "@bbrc/db";
import { readingPace } from "@bbrc/shared";
import { dispatchNotification } from "../notification/notification.service";
import { activeParticipationWhere } from "../sitting/participation-active";

const HOUR_MS = 60 * 60 * 1000;
/** One reminder per member and book every two days at most. */
const REMINDER_COOLDOWN_MS = 48 * HOUR_MS;

/**
 * Tells members who opted in ("You are behind your reading pace", off by
 * default) that they need to speed up to finish their sitting's book on time.
 * Only members with a reading going are considered, and never twice in two days.
 */
export async function sweepReadingReminders(db: Database): Promise<number> {
	const now = new Date();
	const sittings = await db.sitting.findMany({
		where: {
			status: "reading",
			deadline: { gt: now },
			selectedBookId: { not: null },
		},
		select: {
			slug: true,
			deadline: true,
			selectedBookId: true,
			selectedBook: { select: { title: true } },
			participants: {
				where: { ...activeParticipationWhere },
				select: { userId: true },
			},
		},
	});

	let sent = 0;
	for (const sitting of sittings) {
		const bookId = sitting.selectedBookId;
		const userIds = sitting.participants.map((row) => row.userId);
		if (!bookId || userIds.length === 0) continue;

		const [optedIn, readings, recent] = await Promise.all([
			db.notificationPreference.findMany({
				where: {
					kind: "reading_behind",
					inAppEnabled: true,
					userId: { in: userIds },
				},
				select: { userId: true },
			}),
			db.reading.findMany({
				where: { bookId, finishedAt: null, userId: { in: userIds } },
				select: {
					userId: true,
					percent: true,
					totalPages: true,
					currentPage: true,
					startedAt: true,
					logs: {
						orderBy: { createdAt: "desc" },
						take: 40,
						select: { createdAt: true, percent: true, page: true },
					},
				},
			}),
			db.notification.findMany({
				where: {
					kind: "reading_behind",
					href: `/sittings/${sitting.slug}`,
					createdAt: { gte: new Date(now.getTime() - REMINDER_COOLDOWN_MS) },
				},
				select: { userId: true },
			}),
		]);
		const wants = new Set(optedIn.map((row) => row.userId));
		const alreadyTold = new Set(recent.map((row) => row.userId));

		for (const reading of readings) {
			if (!wants.has(reading.userId) || alreadyTold.has(reading.userId))
				continue;
			const pace = readingPace({
				percent: reading.percent,
				totalPages: reading.totalPages,
				currentPage: reading.currentPage,
				startedAt: reading.startedAt,
				logs: reading.logs.map((log) => ({
					at: log.createdAt,
					percent: log.percent,
					page: log.page,
				})),
				deadline: sitting.deadline,
				now,
			});
			if (pace.status !== "behind" || pace.perDayNeeded == null) continue;
			try {
				await dispatchNotification(db, {
					kind: "reading_behind",
					recipientUserIds: [reading.userId],
					message: {
						id: "readingBehind",
						values: {
							hasBook: sitting.selectedBook?.title ? "yes" : "no",
							book: sitting.selectedBook?.title ?? "",
							unit: pace.unit,
							amount: Math.max(1, Math.ceil(pace.perDayNeeded)),
						},
					},
					href: `/sittings/${sitting.slug}`,
				});
				sent += 1;
			} catch (error) {
				console.error("reading reminder failed for a member", error);
			}
		}
	}
	return sent;
}
