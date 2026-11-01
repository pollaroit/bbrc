import type { Database, Prisma } from "@bbrc/db";
import {
	acceptsFriendsAutomatically,
	checkFriendRequest,
	FRIEND_LIMITS,
	FRIEND_REFUSAL_MESSAGES,
	type FriendRelationState,
	friendPair,
	pendingExpiryCutoff,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { dispatchNotification } from "../notification/notification.service";
import { buildItems, userListSelect } from "../people/people.service";
import { loadFriendIds } from "../visibility/viewer";
import {
	readingVisibleWhere,
	readVisibleWhere,
} from "../visibility/visibility-resources";
import type { FriendMember, FriendState } from "./friend.schema";

const DAY_MS = 24 * 60 * 60 * 1000;

const memberSelect = {
	id: true,
	username: true,
	name: true,
	image: true,
	status: true,
	isAdmin: true,
	profileVisibility: true,
	autoAcceptFriends: true,
} as const;

type MemberRow = {
	id: string;
	username: string;
	name: string;
	image: string | null;
	status: string;
	isAdmin: boolean;
	profileVisibility: "public" | "private";
	autoAcceptFriends: boolean;
};

function toMember(row: MemberRow): FriendMember {
	return {
		username: row.username,
		name: row.name,
		image: row.image ?? null,
		isPrivate: row.profileVisibility === "private",
	};
}

async function findMember(
	db: Database,
	username: string,
): Promise<MemberRow | null> {
	return db.user.findUnique({
		where: { username },
		select: memberSelect,
	});
}

async function requireMember(
	db: Database,
	username: string,
): Promise<MemberRow> {
	const member = await findMember(db, username);
	if (!member) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	return member;
}

/** Both blocks that can exist between two members. */
async function blockBetween(db: Database, a: string, b: string) {
	const rows = await db.userBlock.findMany({
		where: {
			OR: [
				{ blockerId: a, blockedId: b },
				{ blockerId: b, blockedId: a },
			],
		},
		select: { blockerId: true },
	});
	return {
		iBlocked: rows.some((row) => row.blockerId === a),
		blockedMe: rows.some((row) => row.blockerId === b),
	};
}

async function relationState(
	db: Database,
	meId: string,
	otherId: string,
): Promise<FriendRelationState> {
	const { lowId, highId } = friendPair(meId, otherId);
	const row = await db.friendship.findUnique({
		where: { userLowId_userHighId: { userLowId: lowId, userHighId: highId } },
		select: { status: true, requesterId: true },
	});
	if (!row) return "none";
	if (row.status === "accepted") return "friends";
	return row.requesterId === meId ? "request_sent" : "request_received";
}

export async function countFriends(
	db: Database,
	userId: string,
): Promise<number> {
	return db.friendship.count({
		where: {
			status: "accepted",
			OR: [
				{ userLowId: userId, userHigh: { status: { not: "banned" } } },
				{ userHighId: userId, userLow: { status: { not: "banned" } } },
			],
		},
	});
}

/** For the friend button. Signed-out visitors and banned or blocked members just see "none" or "unavailable". */
export async function getFriendState(
	db: Database,
	viewer: Viewer,
	username: string,
) {
	const member = await findMember(db, username);
	if (!member) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	const friendCount = await countFriends(db, member.id);
	const autoAccepts = acceptsFriendsAutomatically(member);
	const base = { friendCount, autoAccepts };
	if (viewer.kind === "anonymous") return { state: "none" as const, ...base };
	if (viewer.userId === member.id) return { state: "self" as const, ...base };

	const block = await blockBetween(db, viewer.userId, member.id);
	if (block.iBlocked) return { state: "blocked" as const, ...base };
	if (block.blockedMe || member.status === "banned") {
		return { state: "unavailable" as const, ...base };
	}
	const state: FriendState = await relationState(db, viewer.userId, member.id);
	return { state, ...base };
}

export async function sendFriendRequest(
	db: Database,
	meId: string,
	username: string,
) {
	const [me, target] = await Promise.all([
		db.user.findUnique({ where: { id: meId }, select: memberSelect }),
		findMember(db, username),
	]);
	if (!me || !target) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	const now = new Date();
	const [block, state, lastDeclined, requestsInLastDay, pendingOutgoing] =
		await Promise.all([
			blockBetween(db, me.id, target.id),
			relationState(db, me.id, target.id),
			db.friendRequestLog.findFirst({
				where: {
					requesterId: me.id,
					targetId: target.id,
					declinedAt: { not: null },
				},
				orderBy: { declinedAt: "desc" },
				select: { declinedAt: true },
			}),
			db.friendRequestLog.count({
				where: {
					requesterId: me.id,
					createdAt: { gte: new Date(now.getTime() - DAY_MS) },
				},
			}),
			db.friendship.count({
				where: { requesterId: me.id, status: "pending" },
			}),
		]);

	const decision = checkFriendRequest({
		isSelf: me.id === target.id,
		unavailable: me.status === "banned" || target.status === "banned",
		blocked: block.iBlocked || block.blockedMe,
		state,
		lastDeclinedAt: lastDeclined?.declinedAt ?? null,
		requestsInLastDay,
		pendingOutgoing,
		now,
	});
	if (!decision.ok) {
		throw new ORPCError("BAD_REQUEST", {
			message: FRIEND_REFUSAL_MESSAGES[decision.reason],
			data: { reason: decision.reason },
		});
	}

	if (decision.action === "accept_theirs") {
		await acceptRequest(db, me.id, target.username);
		return { state: "friends" as const };
	}

	const { lowId, highId } = friendPair(me.id, target.id);
	const auto = acceptsFriendsAutomatically(target);
	try {
		await db.$transaction([
			db.friendship.create({
				data: {
					userLowId: lowId,
					userHighId: highId,
					requesterId: me.id,
					status: auto ? "accepted" : "pending",
					respondedAt: auto ? now : null,
				},
			}),
			db.friendRequestLog.create({
				data: { requesterId: me.id, targetId: target.id },
			}),
		]);
	} catch (error) {
		// Two requests at once: the pair already exists.
		if ((error as { code?: string }).code === "P2002") {
			throw new ORPCError("BAD_REQUEST", {
				message: FRIEND_REFUSAL_MESSAGES.already_requested,
			});
		}
		throw error;
	}

	if (auto) {
		void dispatchNotification(db, {
			kind: "friend_accepted",
			recipientUserIds: [me.id],
			title: `You and ${target.name} are now friends`,
			body: "Their friends-only posts and shelves are open to you.",
			href: `/users/${target.username}`,
		});
		return { state: "friends" as const };
	}
	void dispatchNotification(db, {
		kind: "friend_request",
		recipientUserIds: [target.id],
		title: `${me.name} sent you a friend request`,
		body: "Open Friends to accept or decline.",
		href: "/friends?tab=requests",
	});
	return { state: "request_sent" as const };
}

/** Takes back a request you sent. Silent. */
export async function cancelFriendRequest(
	db: Database,
	meId: string,
	username: string,
) {
	const other = await requireMember(db, username);
	const { lowId, highId } = friendPair(meId, other.id);
	await db.friendship.deleteMany({
		where: {
			userLowId: lowId,
			userHighId: highId,
			requesterId: meId,
			status: "pending",
		},
	});
	return { ok: true as const };
}

export async function acceptRequest(
	db: Database,
	meId: string,
	username: string,
) {
	const [me, other] = await Promise.all([
		db.user.findUnique({ where: { id: meId }, select: memberSelect }),
		requireMember(db, username),
	]);
	if (!me) throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	if (me.status === "banned" || other.status === "banned") {
		throw new ORPCError("BAD_REQUEST", {
			message: FRIEND_REFUSAL_MESSAGES.unavailable,
		});
	}
	const block = await blockBetween(db, me.id, other.id);
	if (block.iBlocked || block.blockedMe) {
		throw new ORPCError("BAD_REQUEST", {
			message: FRIEND_REFUSAL_MESSAGES.unavailable,
		});
	}
	const { lowId, highId } = friendPair(me.id, other.id);
	// Only the member who was asked can accept.
	const result = await db.friendship.updateMany({
		where: {
			userLowId: lowId,
			userHighId: highId,
			requesterId: other.id,
			status: "pending",
		},
		data: { status: "accepted", respondedAt: new Date() },
	});
	if (result.count === 0) {
		throw new ORPCError("NOT_FOUND", { message: "That request is gone." });
	}
	void dispatchNotification(db, {
		kind: "friend_accepted",
		recipientUserIds: [other.id],
		title: `${me.name} accepted your friend request`,
		body: "Their friends-only posts and shelves are open to you.",
		href: `/users/${me.username}`,
	});
	return { ok: true as const };
}

/** Says no. Silent, and the sender cannot ask again for 14 days. */
export async function declineRequest(
	db: Database,
	meId: string,
	username: string,
) {
	const other = await requireMember(db, username);
	const { lowId, highId } = friendPair(meId, other.id);
	await db.$transaction(async (tx) => {
		const result = await tx.friendship.deleteMany({
			where: {
				userLowId: lowId,
				userHighId: highId,
				requesterId: other.id,
				status: "pending",
			},
		});
		if (result.count > 0) {
			await tx.friendRequestLog.updateMany({
				where: { requesterId: other.id, targetId: meId, declinedAt: null },
				data: { declinedAt: new Date() },
			});
		}
	});
	return { ok: true as const };
}

/** Ends a friendship. Silent, no cooldown. */
export async function removeFriend(
	db: Database,
	meId: string,
	username: string,
) {
	const other = await requireMember(db, username);
	const { lowId, highId } = friendPair(meId, other.id);
	await db.friendship.deleteMany({
		where: { userLowId: lowId, userHighId: highId, status: "accepted" },
	});
	return { ok: true as const };
}

/** Blocks a member: ends any friendship or request, and the two stop seeing each other. */
export async function blockMember(
	db: Database,
	meId: string,
	username: string,
) {
	const other = await requireMember(db, username);
	if (other.id === meId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot block yourself.",
		});
	}
	if (other.isAdmin) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Admins cannot be blocked.",
		});
	}
	const { lowId, highId } = friendPair(meId, other.id);
	await db.$transaction([
		db.friendship.deleteMany({
			where: { userLowId: lowId, userHighId: highId },
		}),
		db.userBlock.upsert({
			where: { blockerId_blockedId: { blockerId: meId, blockedId: other.id } },
			create: { blockerId: meId, blockedId: other.id },
			update: {},
		}),
	]);
	return { ok: true as const };
}

export async function unblockMember(
	db: Database,
	meId: string,
	username: string,
) {
	const other = await requireMember(db, username);
	await db.userBlock.deleteMany({
		where: { blockerId: meId, blockedId: other.id },
	});
	return { ok: true as const };
}

/**
 * A member's friends as people cards (the same shape and the same privacy
 * handling as the people list). The full list is for the member and their
 * friends (and admins); everyone else gets the count only. `mutualOnly` keeps the
 * friends the viewer shares with the member.
 */
export async function listFriends(
	db: Database,
	viewer: Viewer,
	input: {
		username?: string;
		search?: string;
		mutualOnly?: boolean;
		limit: number;
		cursor?: string;
	},
) {
	const owner =
		input.username != null
			? await requireMember(db, input.username)
			: viewer.kind === "member"
				? await db.user.findUnique({
						where: { id: viewer.userId },
						select: memberSelect,
					})
				: null;
	if (!owner) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	const empty = {
		items: [],
		total: 0,
		metadata: { limit: input.limit, hasNextPage: false, nextCursor: null },
	};
	const count = await countFriends(db, owner.id);
	const mayList =
		viewer.kind === "member" &&
		(viewer.isAdmin ||
			viewer.userId === owner.id ||
			viewer.friendIds.has(owner.id)) &&
		!viewer.blockedIds.has(owner.id);
	if (!mayList || viewer.kind !== "member") {
		return { visible: false, count, ...empty };
	}

	let ids = await loadFriendIds(db, owner.id);
	// Blocked members are not listed (admins have no blocks loaded).
	ids = ids.filter((id) => !viewer.blockedIds.has(id));
	if (input.mutualOnly && viewer.userId !== owner.id) {
		const mine = new Set(
			viewer.isAdmin
				? await loadFriendIds(db, viewer.userId)
				: viewer.friendIds,
		);
		ids = ids.filter((id) => mine.has(id));
	}

	const search = input.search?.trim();
	const where = {
		id: { in: ids },
		...(search
			? {
					OR: [
						{ name: { contains: search, mode: "insensitive" as const } },
						{ username: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {}),
	};
	const [total, rows] = await Promise.all([
		db.user.count({ where }),
		db.user.findMany({
			where,
			orderBy: [{ name: "asc" }, { id: "asc" }],
			take: input.limit + 1,
			...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
			select: userListSelect,
		}),
	]);
	const page = rows.slice(0, input.limit);
	const items = await buildItems(page, db, viewer);
	return {
		visible: true,
		count,
		total,
		items,
		metadata: {
			limit: input.limit,
			hasNextPage: rows.length > input.limit,
			nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
		},
	};
}

/**
 * Friends of the viewer who read a book or are reading it now, each respecting that
 * friend's reads and currently-reading settings. Up to 5 are returned, the ones
 * reading it first; the total counts everyone visible.
 */
export async function friendsWhoReadBook(
	db: Database,
	viewer: Viewer,
	bookSlug: string,
) {
	const empty = {
		total: 0,
		items: [] as (FriendMember & { state: "reading" | "read" })[],
	};
	if (viewer.kind !== "member") return empty;
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true },
	});
	if (!book) return empty;
	const friendIds = (
		viewer.isAdmin
			? await loadFriendIds(db, viewer.userId)
			: [...viewer.friendIds]
	).filter((id) => !viewer.blockedIds.has(id));
	if (friendIds.length === 0) return empty;

	const memberFields = {
		select: {
			username: true,
			name: true,
			image: true,
			profileVisibility: true,
		},
	} as const;
	const [reading, reads] = await Promise.all([
		db.reading.findMany({
			where: {
				bookId: book.id,
				finishedAt: null,
				userId: { in: friendIds },
				AND: [readingVisibleWhere(viewer) as Prisma.ReadingWhereInput],
			},
			select: { userId: true, user: memberFields },
		}),
		db.read.findMany({
			where: {
				bookId: book.id,
				userId: { in: friendIds },
				AND: [readVisibleWhere(viewer) as Prisma.ReadWhereInput],
			},
			select: { userId: true, user: memberFields },
		}),
	]);

	const seen = new Set<string>();
	const all: (FriendMember & { state: "reading" | "read" })[] = [];
	for (const [state, rows] of [
		["reading", reading],
		["read", reads],
	] as const) {
		for (const row of rows) {
			if (seen.has(row.userId)) continue;
			seen.add(row.userId);
			all.push({
				username: row.user.username,
				name: row.user.name,
				image: row.user.image ?? null,
				isPrivate: row.user.profileVisibility === "private",
				state,
			});
		}
	}
	return { total: all.length, items: all.slice(0, 5) };
}

/** The member's pending requests, both directions (banned members left out). */
export async function listFriendRequests(db: Database, meId: string) {
	const rows = await db.friendship.findMany({
		where: {
			status: "pending",
			OR: [{ userLowId: meId }, { userHighId: meId }],
		},
		orderBy: { createdAt: "desc" },
		select: {
			createdAt: true,
			requesterId: true,
			userLowId: true,
			userLow: { select: memberSelect },
			userHigh: { select: memberSelect },
		},
	});
	const incoming: (FriendMember & { sentAt: Date })[] = [];
	const outgoing: (FriendMember & { sentAt: Date })[] = [];
	for (const row of rows) {
		const other = row.userLowId === meId ? row.userHigh : row.userLow;
		if (other.status === "banned") continue;
		const item = { ...toMember(other), sentAt: row.createdAt };
		(row.requesterId === meId ? outgoing : incoming).push(item);
	}
	return { incoming, outgoing };
}

export async function listBlocked(db: Database, meId: string) {
	const rows = await db.userBlock.findMany({
		where: { blockerId: meId },
		orderBy: { createdAt: "desc" },
		select: { createdAt: true, blocked: { select: memberSelect } },
	});
	return {
		items: rows.map((row) => ({
			...toMember(row.blocked),
			blockedAt: row.createdAt,
		})),
	};
}

/** How many requests wait for an answer, for the badge. */
export async function countIncomingRequests(
	db: Database,
	meId: string,
): Promise<number> {
	return db.friendship.count({
		where: {
			status: "pending",
			requesterId: { not: meId },
			OR: [
				{ userLowId: meId, userHigh: { status: { not: "banned" } } },
				{ userHighId: meId, userLow: { status: { not: "banned" } } },
			],
		},
	});
}

/** Part of the daily sweep: removes requests nobody answered for 90 days. */
export async function expireStalePendingRequests(
	db: Database,
	now = new Date(),
): Promise<number> {
	const result = await db.friendship.deleteMany({
		where: { status: "pending", createdAt: { lt: pendingExpiryCutoff(now) } },
	});
	return result.count;
}

export { FRIEND_LIMITS };
