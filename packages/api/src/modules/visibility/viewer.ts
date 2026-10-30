import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import { ANONYMOUS_VIEWER, memberViewer, type Viewer } from "@bbrc/shared";

/** Accepted friends of a member (banned members left out: their friendships are dormant). */
export async function loadFriendIds(
	db: Database,
	userId: string,
): Promise<string[]> {
	const rows = await db.friendship.findMany({
		where: {
			status: "accepted",
			OR: [{ userLowId: userId }, { userHighId: userId }],
		},
		select: {
			userLowId: true,
			userHighId: true,
			userLow: { select: { status: true } },
			userHigh: { select: { status: true } },
		},
	});
	return rows.flatMap((row) => {
		const mineIsLow = row.userLowId === userId;
		const other = mineIsLow ? row.userHigh : row.userLow;
		return other.status === "banned"
			? []
			: [mineIsLow ? row.userHighId : row.userLowId];
	});
}

/** Everyone who blocked this member, or whom this member blocked. */
export async function loadBlockedIds(
	db: Database,
	userId: string,
): Promise<string[]> {
	const rows = await db.userBlock.findMany({
		where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
		select: { blockerId: true, blockedId: true },
	});
	return [
		...new Set(
			rows.map((row) =>
				row.blockerId === userId ? row.blockedId : row.blockerId,
			),
		),
	];
}

/**
 * Who is looking, for the whole request. Every read service takes the result as a
 * required argument (see `packages/shared/src/visibility`).
 */
export async function loadViewer(
	db: Database,
	session: Session | null | undefined,
): Promise<Viewer> {
	const user = session?.user;
	if (!user) return ANONYMOUS_VIEWER;
	const isAdmin = user.isAdmin === true;
	// An admin sees everything: no need to load who is a friend or blocked.
	if (isAdmin) return memberViewer({ userId: user.id, isAdmin: true });
	const [friendIds, blockedIds] = await Promise.all([
		loadFriendIds(db, user.id),
		loadBlockedIds(db, user.id),
	]);
	return memberViewer({
		userId: user.id,
		isAdmin: false,
		friendIds,
		blockedIds,
	});
}
