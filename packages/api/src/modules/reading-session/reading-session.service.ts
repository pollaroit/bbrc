import type { Database } from "@bbrc/db";
import {
	canView,
	clampSessionSeconds,
	isReadingNow,
	READING_PRESENCE_TTL_MS,
	READING_SESSION_MAX_SECONDS,
	READING_SESSION_STALE_MS,
	relationTo,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { realtimeClientId } from "../../lib/realtime/client-id";
import { viewerIdOf } from "../read/section-access";
import { getMyReadingStats } from "../reading/reading.service";
import type {
	EndReadingSessionOutput,
	ReadingPresenceOutput,
	ReadingSessionView,
	StartFreeReadingSessionInput,
	StartReadingSessionInput,
} from "./reading-session.schema";

const sessionSelect = {
	id: true,
	readingId: true,
	label: true,
	pageTo: true,
	startedAt: true,
	lastBeatAt: true,
	endedAt: true,
	activeSeconds: true,
	mode: true,
	targetMinutes: true,
	percentFrom: true,
	pageFrom: true,
} as const;

function view(row: ReadingSessionView): ReadingSessionView {
	return { ...row };
}

/** Sessions nobody has beaten for a while end at their last beat, not when we noticed. */
async function closeStaleSessions(db: Database, userId: string, now: Date) {
	const cutoff = new Date(now.getTime() - READING_SESSION_STALE_MS);
	await db.$executeRaw`
		UPDATE reading_session SET ended_at = last_beat_at
		WHERE user_id = ${userId} AND ended_at IS NULL AND last_beat_at < ${cutoff}`;
}

async function loadOwnOpenSession(db: Database, userId: string, id: string) {
	const row = await db.readingSession.findFirst({
		where: { id, userId },
		select: { ...sessionSelect, reading: { select: { finishedAt: true } } },
	});
	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Session not found." });
	}
	return row;
}

export async function startReadingSession(
	db: Database,
	userId: string,
	input: StartReadingSessionInput,
): Promise<ReadingSessionView> {
	const now = new Date();
	const reading = await db.reading.findFirst({
		where: { id: input.readingId, userId },
		select: { id: true, finishedAt: true, percent: true, currentPage: true },
	});
	if (!reading) {
		throw new ORPCError("NOT_FOUND", { message: "Reading not found." });
	}
	if (reading.finishedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This book is already finished.",
		});
	}

	return db.$transaction(async (tx) => {
		// Starting somewhere else takes over: the earlier session ends where it was.
		await tx.readingSession.updateMany({
			where: { userId, endedAt: null },
			data: { endedAt: now },
		});
		const created = await tx.readingSession.create({
			data: {
				userId,
				readingId: reading.id,
				startedAt: now,
				lastBeatAt: now,
				mode: input.mode,
				targetMinutes:
					input.mode === "countdown" ? (input.targetMinutes ?? null) : null,
				percentFrom: reading.percent,
				pageFrom: reading.currentPage,
			},
			select: sessionSelect,
		});
		return view(created);
	});
}

/**
 * A session without a book: the timer, sounds and music, nothing else. It is saved
 * (closing the tab keeps the time) but never counted in reading stats, streaks,
 * achievements or "reading now". Starting one ends any other open session.
 */
export async function startFreeReadingSession(
	db: Database,
	userId: string,
	input: StartFreeReadingSessionInput,
): Promise<ReadingSessionView> {
	const now = new Date();
	return db.$transaction(async (tx) => {
		await tx.readingSession.updateMany({
			where: { userId, endedAt: null },
			data: { endedAt: now },
		});
		const created = await tx.readingSession.create({
			data: {
				userId,
				readingId: null,
				label: input.label?.trim() || null,
				startedAt: now,
				lastBeatAt: now,
				mode: input.mode,
				targetMinutes:
					input.mode === "countdown" ? (input.targetMinutes ?? null) : null,
				pageFrom: 0,
				pageTo: 0,
			},
			select: sessionSelect,
		});
		return view(created);
	});
}

/** The member's open session without a book, if there still is one. */
export async function getCurrentFreeReadingSession(
	db: Database,
	userId: string,
): Promise<ReadingSessionView | null> {
	await closeStaleSessions(db, userId, new Date());
	const row = await db.readingSession.findFirst({
		where: { userId, readingId: null, endedAt: null },
		select: sessionSelect,
	});
	return row ? view(row) : null;
}

/** Pages typed by hand during a session without a book. */
export async function setFreeSessionPages(
	db: Database,
	userId: string,
	input: { sessionId: string; pages: number },
): Promise<ReadingSessionView> {
	const row = await loadOwnOpenSession(db, userId, input.sessionId);
	if (row.readingId != null) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Update the page on the book itself.",
		});
	}
	const updated = await db.readingSession.update({
		where: { id: row.id },
		data: { pageTo: input.pages },
		select: sessionSelect,
	});
	return view(updated);
}

/** The member's open session on this reading, if there still is one. */
export async function getCurrentReadingSession(
	db: Database,
	userId: string,
	readingId: string,
): Promise<ReadingSessionView | null> {
	await closeStaleSessions(db, userId, new Date());
	const row = await db.readingSession.findFirst({
		where: { userId, readingId, endedAt: null },
		select: sessionSelect,
	});
	return row ? view(row) : null;
}

/**
 * Opens a session again that was closed only because the page went quiet (a
 * phone that slept mid-session, an app that was killed). The member's own timer
 * is the proof they kept reading; the amount is still held to the clock.
 */
export async function resumeReadingSession(
	db: Database,
	userId: string,
	input: { sessionId: string; activeSeconds: number },
): Promise<ReadingSessionView> {
	const row = await loadOwnOpenSession(db, userId, input.sessionId);
	const now = new Date();
	if (row.reading?.finishedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This book is already finished.",
		});
	}
	const age = now.getTime() - row.startedAt.getTime();
	if (row.endedAt && age > READING_SESSION_MAX_SECONDS * 1000) {
		throw new ORPCError("BAD_REQUEST", { message: "This session is too old." });
	}

	return db.$transaction(async (tx) => {
		const other = await tx.readingSession.findFirst({
			where: { userId, endedAt: null, NOT: { id: row.id } },
			select: { id: true },
		});
		if (other) {
			throw new ORPCError("CONFLICT", {
				message: "Reading Mode was started somewhere else.",
			});
		}
		const activeSeconds = clampSessionSeconds({
			reported: input.activeSeconds,
			saved: row.activeSeconds,
			startedAt: row.startedAt,
			// The gap since the last beat is exactly what the member's timer is vouching for.
			lastBeatAt: row.lastBeatAt,
			now,
		});
		const updated = await tx.readingSession.update({
			where: { id: row.id },
			data: { activeSeconds, lastBeatAt: now, endedAt: null },
			select: sessionSelect,
		});
		return view(updated);
	});
}

/** "I am still reading": saves the time so far and keeps "reading now" fresh. */
export async function beatReadingSession(
	db: Database,
	userId: string,
	input: { sessionId: string; activeSeconds: number },
): Promise<ReadingSessionView> {
	const row = await loadOwnOpenSession(db, userId, input.sessionId);
	if (row.endedAt) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This session has ended.",
		});
	}
	const now = new Date();
	const activeSeconds = clampSessionSeconds({
		reported: input.activeSeconds,
		saved: row.activeSeconds,
		startedAt: row.startedAt,
		lastBeatAt: row.lastBeatAt,
		now,
	});
	const updated = await db.readingSession.update({
		where: { id: row.id },
		data: { activeSeconds, lastBeatAt: now },
		select: sessionSelect,
	});
	return view(updated);
}

export async function endReadingSession(
	db: Database,
	userId: string,
	input: { sessionId: string; activeSeconds: number },
): Promise<EndReadingSessionOutput> {
	const row = await loadOwnOpenSession(db, userId, input.sessionId);
	const now = new Date();

	// Ending twice (a retry, two tabs) is harmless: the second call changes nothing.
	const activeSeconds = row.endedAt
		? row.activeSeconds
		: clampSessionSeconds({
				reported: input.activeSeconds,
				saved: row.activeSeconds,
				startedAt: row.startedAt,
				lastBeatAt: row.lastBeatAt,
				now,
			});

	const reading = row.readingId
		? await db.reading.findFirst({
				where: { id: row.readingId, userId },
				select: { percent: true, currentPage: true },
			})
		: null;
	// Without a book there is nothing to read back: the pages typed in stay as they are.
	const pageTo = row.readingId ? (reading?.currentPage ?? null) : row.pageTo;

	const saved = row.endedAt
		? row
		: await db.readingSession.update({
				where: { id: row.id },
				data: {
					activeSeconds,
					lastBeatAt: now,
					endedAt: now,
					percentTo: reading?.percent ?? row.percentFrom,
					pageTo,
				},
				select: sessionSelect,
			});

	const stats = await getMyReadingStats(db, userId);
	return {
		...view(saved),
		percentTo: reading?.percent ?? row.percentFrom,
		pageTo,
		streakDays: stats.currentStreak,
	};
}

/** Who is in Reading Mode on a book right now. Names only for members who show what they read. */
export async function getReadingPresence(
	db: Database,
	viewer: Viewer,
	bookSlug: string,
	liveClientIds?: string[],
): Promise<ReadingPresenceOutput> {
	const viewerId = viewerIdOf(viewer);
	// Realtime says who is on the channel right now, as opaque ids. Only the
	// server can match them to members, so nobody watching can tell who is who.
	const live = liveClientIds ? new Set(liveClientIds) : null;
	const since = new Date(
		Date.now() -
			(live ? READING_SESSION_MAX_SECONDS * 1000 : READING_PRESENCE_TTL_MS),
	);
	const rows = await db.readingSession.findMany({
		where: {
			endedAt: null,
			lastBeatAt: { gte: since },
			reading: { book: { slug: bookSlug }, finishedAt: null },
		},
		orderBy: { startedAt: "asc" },
		take: 200,
		select: {
			lastBeatAt: true,
			user: {
				select: {
					id: true,
					username: true,
					name: true,
					image: true,
					profileVisibility: true,
					readingVisibility: true,
				},
			},
		},
	});
	const now = new Date();
	const present = live
		? rows.filter((row) => {
				const id = realtimeClientId(row.user.id);
				return id != null && live.has(id);
			})
		: rows.filter((row) => isReadingNow(row.lastBeatAt, now));
	// One member in two tabs or on two devices is one reader.
	const members = [
		...new Map(present.map((row) => [row.user.id, row])).values(),
	];
	return {
		count: members.length,
		viewerPresent: members.some((row) => row.user.id === viewerId),
		readers: members
			// The count above is everyone; names follow the member's reading setting.
			.filter(
				(row) =>
					row.user.id !== viewerId &&
					canView(relationTo(viewer, row.user.id), {
						profile: row.user.profileVisibility,
						section: row.user.readingVisibility,
					}),
			)
			.slice(0, 12)
			.map((row) => ({
				username: row.user.username,
				name: row.user.name,
				image: row.user.image ?? null,
			})),
	};
}

/** Total saved reading seconds of a member (finished sessions and the open one). */
export async function totalReadingSeconds(
	db: Database,
	userId: string,
): Promise<number> {
	const sum = await db.readingSession.aggregate({
		where: { userId, readingId: { not: null } },
		_sum: { activeSeconds: true },
	});
	return sum._sum.activeSeconds ?? 0;
}
