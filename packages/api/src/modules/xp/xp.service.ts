import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import {
	buildPointsChartSeries,
	buildRunningBalanceLookup,
} from "../points/points-history";
import {
	assertMemberVisible,
	viewerFromSession,
} from "../user/user-visibility";
import {
	type AwardCommentXpInput,
	type AwardFeedbackXpInput,
	type AwardParticipationXpInput,
	type AwardPollVoteXpInput,
	type AwardPostXpInput,
	type GetXpChartInput,
	type GetXpChartOutput,
	type GetXpEventListInput,
	type GetXpEventListOutput,
	getXpEventListFields,
	REASON_LABELS,
	XP_AWARD,
} from "./xp.schema";
import {
	getXpEntitySource,
	resolveXpEntitySources,
} from "./xp-entity-resolver";

type XpEventListRow = Prisma.XPEventGetPayload<{
	select: typeof getXpEventListFields;
}>;

const xpEventListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: XpEventListRow): string {
		return item.id;
	},
};

type AwardXpInput = {
	userId: string;
	reason: Prisma.XPEventCreateInput["reason"];
	entityId: string;
	points: number;
};

/**
 * Records XP once per (user, reason, entity). Returns true when points were
 * granted, false when this combination was already awarded.
 */
export async function tryAwardXp(
	input: AwardXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	const existing = await tx.xPEvent.findFirst({
		where: {
			userId: input.userId,
			reason: input.reason,
			entityId: input.entityId,
		},
		select: { id: true },
	});

	if (existing) {
		return false;
	}

	await tx.xPEvent.create({
		data: {
			userId: input.userId,
			points: input.points,
			reason: input.reason,
			entityId: input.entityId,
		},
	});

	await tx.user.update({
		where: { id: input.userId },
		data: { xp: { increment: input.points } },
	});

	return true;
}

export async function awardParticipationXp(
	input: AwardParticipationXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "participation",
			entityId: input.sittingId,
			points: XP_AWARD.participation,
		},
		tx,
	);
}

/**
 * Participation XP for many users in a fixed number of queries. Looping
 * `awardParticipationXp` costs three round trips per member, which can outlast
 * a transaction when a sitting starts with a large roster.
 */
export async function awardParticipationXpBulk(
	input: { userIds: string[]; sittingId: string },
	tx: DatabaseTransaction,
): Promise<number> {
	if (input.userIds.length === 0) {
		return 0;
	}

	const existing = await tx.xPEvent.findMany({
		where: {
			reason: "participation",
			entityId: input.sittingId,
			userId: { in: input.userIds },
		},
		select: { userId: true },
	});
	const alreadyAwarded = new Set(existing.map((event) => event.userId));
	const pending = [...new Set(input.userIds)].filter(
		(userId) => !alreadyAwarded.has(userId),
	);

	if (pending.length === 0) {
		return 0;
	}

	await tx.xPEvent.createMany({
		data: pending.map((userId) => ({
			userId,
			points: XP_AWARD.participation,
			reason: "participation" as const,
			entityId: input.sittingId,
		})),
	});

	await tx.user.updateMany({
		where: { id: { in: pending } },
		data: { xp: { increment: XP_AWARD.participation } },
	});

	return pending.length;
}

/** First saved vote on a poll only; edits must not call this again. */
export async function awardPollVoteXp(
	input: AwardPollVoteXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "vote",
			entityId: input.pollId,
			points: XP_AWARD.vote,
		},
		tx,
	);
}

export async function awardFeedbackXp(
	input: AwardFeedbackXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "feedback",
			entityId: input.feedbackId,
			points: XP_AWARD.feedback,
		},
		tx,
	);
}

export async function awardPostXp(
	input: AwardPostXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "post",
			entityId: input.postId,
			points: XP_AWARD.post,
		},
		tx,
	);
}

export async function awardCommentXp(
	input: AwardCommentXpInput,
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "comment",
			entityId: input.commentId,
			points: XP_AWARD.comment,
		},
		tx,
	);
}

export async function awardBookRequestXp(
	input: { userId: string; bookRequestId: string },
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "request",
			entityId: input.bookRequestId,
			points: XP_AWARD.request,
		},
		tx,
	);
}

export async function awardShelfXp(
	input: { userId: string; shelfId: string },
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "shelf",
			entityId: input.shelfId,
			points: XP_AWARD.shelf,
		},
		tx,
	);
}

export async function awardGoalXp(
	input: { userId: string; goalId: string },
	tx: DatabaseTransaction,
): Promise<boolean> {
	return tryAwardXp(
		{
			userId: input.userId,
			reason: "goal",
			entityId: input.goalId,
			points: XP_AWARD.goal,
		},
		tx,
	);
}

async function loadXpUser(
	username: string,
	db: Database,
	session: Session | null,
) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, xp: true, createdAt: true, isHidden: true },
	});

	assertMemberVisible(user, viewerFromSession(session));

	return user;
}

export async function getXpChart(
	input: GetXpChartInput,
	db: Database,
	session: Session | null = null,
): Promise<GetXpChartOutput> {
	const user = await loadXpUser(input.username, db, session);

	const eventsAsc = await db.xPEvent.findMany({
		where: { userId: user.id },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: { createdAt: true, points: true },
	});

	return {
		currentTotal: user.xp,
		points: buildPointsChartSeries(user.createdAt, user.xp, eventsAsc),
	};
}

export async function getXpEventList(
	input: GetXpEventListInput,
	db: Database,
	session: Session | null = null,
): Promise<GetXpEventListOutput> {
	const user = await loadXpUser(input.username, db, session);

	const balanceEvents = await db.xPEvent.findMany({
		where: {
			userId: user.id,
			reason: input.reasons ? { in: input.reasons } : undefined,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: { id: true, points: true },
	});

	const balanceLookup = buildRunningBalanceLookup(balanceEvents, user.xp);

	const pagination = definePagination.cursor(input, xpEventListCursorCodec);

	const rows = await db.xPEvent.findMany({
		...pagination.use(),
		where: {
			userId: user.id,
			reason: input.reasons ? { in: input.reasons } : undefined,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: getXpEventListFields,
	});

	const paginated = pagination.paginate(rows);
	const sources = await resolveXpEntitySources(db, paginated.items);

	return {
		items: paginated.items.map((row) => {
			const balance = balanceLookup.get(row.id) ?? {
				before: user.xp,
				after: user.xp,
			};
			const source = getXpEntitySource(sources, row.reason, row.entityId);

			return {
				id: row.id,
				createdAt: row.createdAt,
				points: row.points,
				reason: row.reason,
				reasonLabel: REASON_LABELS[row.reason],
				sourceLabel: source.label,
				sourceHref: source.href,
				xpBefore: balance.before,
				xpAfter: balance.after,
			};
		}),
		metadata: paginated.metadata,
	};
}
