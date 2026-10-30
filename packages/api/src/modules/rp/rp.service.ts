import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import {
	buildPointsChartSeries,
	buildRunningBalanceLookup,
} from "../points/points-history";
import type { ParticipationProgress } from "../sitting/participation-progress";
import { progressAffectsUserStatus } from "../sitting/participation-progress";
import { assertMayViewMember, memberAccessSelect } from "../user/member-access";
import {
	type ApplyRpForFinishedSittingInput,
	type GetRpChartInput,
	type GetRpChartOutput,
	type GetRpEventListInput,
	type GetRpEventListOutput,
	getRpEventListFields,
	type RevertRpForDeletedSittingInput,
} from "./rp.schema";

type RpEventListRow = Prisma.RPEventGetPayload<{
	select: typeof getRpEventListFields;
}>;

const rpEventListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: RpEventListRow): string {
		return item.id;
	},
};

/** RP delta applied when a sitting finishes (signed integer). */
export function calculateRpPointsDelta(
	progress: Extract<ParticipationProgress, "completed" | "dnf">,
	bookPages: number,
): number {
	if (bookPages < 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Book page count must be at least 1",
		});
	}

	if (progress === "completed") {
		return Math.round(bookPages / 10);
	}

	return -Math.round(1000 / bookPages);
}

type FinishedSittingParticipant = {
	userId: string;
	progress: ParticipationProgress;
};

export async function applyRpForFinishedSitting(
	input: ApplyRpForFinishedSittingInput,
	db: DatabaseTransaction,
	participants?: FinishedSittingParticipant[],
): Promise<void> {
	const existing = await db.rPEvent.findFirst({
		where: { sittingId: input.sittingId },
		select: { id: true },
	});

	if (existing) {
		return;
	}

	const rows =
		participants ??
		(await db.participation.findMany({
			where: { sittingId: input.sittingId },
			select: { userId: true, progress: true },
		}));

	const eventRows: { userId: string; sittingId: string; points: number }[] = [];
	const rpDeltaByUserId = new Map<string, number>();

	for (const participant of rows) {
		if (!progressAffectsUserStatus(participant.progress)) {
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

		rpDeltaByUserId.set(
			participant.userId,
			(rpDeltaByUserId.get(participant.userId) ?? 0) + points,
		);
	}

	if (eventRows.length === 0) {
		return;
	}

	await db.rPEvent.createMany({ data: eventRows });

	await Promise.all(
		[...rpDeltaByUserId.entries()].map(([userId, points]) =>
			db.user.update({
				where: { id: userId },
				data: { rp: { increment: points } },
			}),
		),
	);
}

/**
 * Undo RP granted for a sitting before it is deleted. RPEvent rows are removed
 * by cascade when the sitting is deleted.
 */
export async function revertRpForDeletedSitting(
	input: RevertRpForDeletedSittingInput,
	db: DatabaseTransaction,
): Promise<void> {
	const events = await db.rPEvent.findMany({
		where: { sittingId: input.sittingId },
		select: { userId: true, points: true },
	});

	if (events.length === 0) {
		return;
	}

	const totalsByUser = new Map<string, number>();

	for (const event of events) {
		totalsByUser.set(
			event.userId,
			(totalsByUser.get(event.userId) ?? 0) + event.points,
		);
	}

	for (const [userId, points] of totalsByUser) {
		await db.user.update({
			where: { id: userId },
			data: { rp: { increment: -points } },
		});
	}
}

async function loadRpUser(username: string, db: Database, viewer: Viewer) {
	const user = await db.user.findUnique({
		where: { username },
		select: { ...memberAccessSelect, rp: true, createdAt: true },
	});

	// RP events follow the profile level.
	assertMayViewMember(user, viewer, { username });

	return user;
}

export async function getRpChart(
	input: GetRpChartInput,
	db: Database,
	viewer: Viewer,
): Promise<GetRpChartOutput> {
	const user = await loadRpUser(input.username, db, viewer);

	const eventsAsc = await db.rPEvent.findMany({
		where: { userId: user.id },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: { createdAt: true, points: true },
	});

	return {
		currentTotal: user.rp,
		points: buildPointsChartSeries(user.createdAt, user.rp, eventsAsc),
	};
}

export async function getRpEventList(
	input: GetRpEventListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetRpEventListOutput> {
	const user = await loadRpUser(input.username, db, viewer);

	const balanceEvents = await db.rPEvent.findMany({
		where: { userId: user.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: { id: true, points: true },
	});

	const balanceLookup = buildRunningBalanceLookup(balanceEvents, user.rp);

	const pagination = definePagination.cursor(input, rpEventListCursorCodec);

	const rows = await db.rPEvent.findMany({
		...pagination.use(),
		where: { userId: user.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: getRpEventListFields,
	});

	const paginated = pagination.paginate(rows);

	return {
		items: paginated.items.map((row) => {
			const balance = balanceLookup.get(row.id) ?? {
				before: user.rp,
				after: user.rp,
			};

			return {
				id: row.id,
				createdAt: row.createdAt,
				points: row.points,
				sittingSlug: row.sitting.slug,
				sittingTitle: row.sitting.selectedBook?.title ?? null,
				rpBefore: balance.before,
				rpAfter: balance.after,
			};
		}),
		metadata: paginated.metadata,
	};
}
