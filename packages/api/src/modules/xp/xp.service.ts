import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import {
	buildPointsChartSeries,
	buildRunningBalanceLookup,
} from "../points/points-history";
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

async function loadXpUser(username: string, db: Database) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true, xp: true, createdAt: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username },
		});
	}

	return user;
}

export async function getXpChart(
	input: GetXpChartInput,
	db: Database,
): Promise<GetXpChartOutput> {
	const user = await loadXpUser(input.username, db);

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
): Promise<GetXpEventListOutput> {
	const user = await loadXpUser(input.username, db);

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
