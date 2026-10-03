import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { hashPassword } from "better-auth/crypto";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	adminUserListRanging,
	adminUserListSearching,
	adminUserListSorting,
} from "./admin-user.listing";
import type {
	AdminDeleteUserInput,
	AdminDeleteUserOutput,
	AdminSetUserPasswordInput,
	AdminSetUserPasswordOutput,
	AdminUpdateUserNameInput,
	AdminUpdateUserNameOutput,
	AdminUpdateUserRoleInput,
	AdminUpdateUserRoleOutput,
	AdminUpdateUserStatusInput,
	AdminUpdateUserStatusOutput,
	AdminUserStatsOutput,
	ListAdminUsersInput,
	ListAdminUsersOutput,
} from "./admin-user.schema";
import { adminUserListSelect } from "./admin-user.schema";

type AdminUserListRow = Prisma.UserGetPayload<{
	select: typeof adminUserListSelect;
}>;

function withStableUsernameOrderBy(
	orderBy: Prisma.UserOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput[] {
	return [orderBy, { username: sortDirection }];
}

function mapAdminUserRow(row: AdminUserListRow) {
	return {
		id: row.id,
		username: row.username,
		name: row.name,
		email: row.email,
		image: row.image,
		isAdmin: row.isAdmin,
		status: row.status,
		xp: row.xp,
		rp: row.rp,
		createdAt: row.createdAt,
		counts: {
			posts: row._count.posts,
			comments: row._count.comments,
			likes: row._count.likes,
			feedbacks: row._count.feedbacks,
			participations: row._count.participations,
			favorites: row._count.favorites,
			shelves: row._count.shelves,
		},
	};
}

async function userIdsWithMinRelationCount(
	db: Database,
	relation:
		| "posts"
		| "comments"
		| "likes"
		| "feedbacks"
		| "participations"
		| "favorites",
	min: number,
): Promise<string[]> {
	if (min <= 0) {
		return [];
	}

	switch (relation) {
		case "posts": {
			const rows = await db.post.groupBy({
				by: ["authorId"],
				_count: { _all: true },
				having: { authorId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.authorId);
		}
		case "comments": {
			const rows = await db.comment.groupBy({
				by: ["authorId"],
				_count: { _all: true },
				having: { authorId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.authorId);
		}
		case "likes": {
			const rows = await db.like.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "feedbacks": {
			const rows = await db.feedback.groupBy({
				by: ["authorId"],
				_count: { _all: true },
				having: { authorId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.authorId);
		}
		case "participations": {
			const rows = await db.participation.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "favorites": {
			const rows = await db.favorite.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
	}
}

function intersectIds(
	current: string[] | null,
	next: string[],
): string[] | null {
	if (current === null) {
		return next;
	}
	const nextSet = new Set(next);
	return current.filter((id) => nextSet.has(id));
}

async function resolveMinCountUserIds(
	db: Database,
	input: ListAdminUsersInput,
): Promise<string[] | null> {
	const filters: Array<{
		key: keyof ListAdminUsersInput;
		relation: Parameters<typeof userIdsWithMinRelationCount>[1];
	}> = [
		{ key: "minPosts", relation: "posts" },
		{ key: "minComments", relation: "comments" },
		{ key: "minLikes", relation: "likes" },
		{ key: "minFeedbacks", relation: "feedbacks" },
		{ key: "minParticipations", relation: "participations" },
		{ key: "minFavorites", relation: "favorites" },
	];

	let ids: string[] | null = null;

	for (const filter of filters) {
		const min = input[filter.key];
		if (typeof min !== "number" || min <= 0) {
			continue;
		}

		const matched = await userIdsWithMinRelationCount(db, filter.relation, min);
		if (matched.length === 0) {
			return [];
		}

		ids = intersectIds(ids, matched);
		if (ids?.length === 0) {
			return [];
		}
	}

	return ids;
}

export async function listAdminUsers(
	input: ListAdminUsersInput,
	db: Database,
): Promise<ListAdminUsersOutput> {
	const pagination = definePagination.offset(input);
	const sorting = adminUserListSorting.from(input);
	const ranging = adminUserListRanging.from(input);
	const searching = adminUserListSearching.from(input);

	const minCountIds = await resolveMinCountUserIds(db, input);

	if (minCountIds?.length === 0) {
		return pagination.paginate([], 0);
	}

	const where = mergeWhereFragments<Prisma.UserWhereInput>(
		ranging.use(),
		searching.use(),
		{
			id: minCountIds ? { in: minCountIds } : undefined,
			status: input.statuses ? { in: input.statuses } : undefined,
			isAdmin: input.isAdmin === undefined ? undefined : input.isAdmin,
			xp: input.minXp != null ? { gte: input.minXp } : undefined,
			rp: input.minRp != null ? { gte: input.minRp } : undefined,
		},
	);

	const [total, rows] = await Promise.all([
		db.user.count({ where }),
		db.user.findMany({
			...pagination.use(),
			where,
			orderBy: withStableUsernameOrderBy(sorting.use(), sorting.sortDirection),
			select: adminUserListSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapAdminUserRow), total);
}

export async function getAdminUserStats(
	db: Database,
): Promise<AdminUserStatsOutput> {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - 29);
	since.setUTCHours(0, 0, 0, 0);

	const [
		totalUsers,
		adminCount,
		activeCount,
		warnedCount,
		bannedCount,
		postCount,
		commentCount,
		likeCount,
		feedbackCount,
		participationCount,
		favoriteCount,
		shelfCount,
		recentUsers,
	] = await Promise.all([
		db.user.count(),
		db.user.count({ where: { isAdmin: true } }),
		db.user.count({ where: { status: "active" } }),
		db.user.count({ where: { status: "warned" } }),
		db.user.count({ where: { status: "banned" } }),
		db.post.count(),
		db.comment.count(),
		db.like.count(),
		db.feedback.count(),
		db.participation.count(),
		db.favorite.count(),
		db.shelf.count(),
		db.user.findMany({
			where: { createdAt: { gte: since } },
			select: { createdAt: true },
			orderBy: { createdAt: "asc" },
		}),
	]);

	const countsByDay = new Map<string, number>();
	for (let i = 0; i < 30; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		countsByDay.set(day.toISOString().slice(0, 10), 0);
	}

	for (const user of recentUsers) {
		const key = user.createdAt.toISOString().slice(0, 10);
		if (countsByDay.has(key)) {
			countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
		}
	}

	return {
		totals: {
			users: totalUsers,
			admins: adminCount,
			active: activeCount,
			warned: warnedCount,
			banned: bannedCount,
		},
		engagement: {
			posts: postCount,
			comments: commentCount,
			likes: likeCount,
			feedbacks: feedbackCount,
			participations: participationCount,
			favorites: favoriteCount,
			shelves: shelfCount,
		},
		signupsByDay: [...countsByDay.entries()].map(([date, count]) => ({
			date,
			count,
		})),
	};
}

async function getUserIdByUsername(db: Database, username: string) {
	const user = await db.user.findUnique({
		where: { username },
		select: { id: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username },
		});
	}

	return user.id;
}

export async function adminUpdateUserName(
	input: AdminUpdateUserNameInput,
	db: Database,
): Promise<AdminUpdateUserNameOutput> {
	try {
		return await db.user.update({
			where: { username: input.username },
			data: { name: input.name },
			select: { username: true, name: true },
		});
	} catch {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}
}

export async function adminUpdateUserRole(
	input: AdminUpdateUserRoleInput,
	actorUserId: string,
	db: Database,
): Promise<AdminUpdateUserRoleOutput> {
	const target = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, isAdmin: true },
	});

	if (!target) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	if (target.id === actorUserId && !input.isAdmin) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot remove your own admin role.",
		});
	}

	return db.user.update({
		where: { username: input.username },
		data: { isAdmin: input.isAdmin },
		select: { username: true, isAdmin: true },
	});
}

export async function adminUpdateUserStatus(
	input: AdminUpdateUserStatusInput,
	db: Database,
): Promise<AdminUpdateUserStatusOutput> {
	try {
		return await db.user.update({
			where: { username: input.username },
			data: { status: input.status },
			select: { username: true, status: true },
		});
	} catch {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}
}

export async function adminDeleteUser(
	input: AdminDeleteUserInput,
	actorUserId: string,
	db: Database,
): Promise<AdminDeleteUserOutput> {
	const target = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!target) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	if (target.id === actorUserId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot delete your own account from the admin dashboard.",
		});
	}

	await db.user.delete({ where: { id: target.id } });

	return { username: input.username };
}

export async function adminSetUserPassword(
	input: AdminSetUserPasswordInput,
	db: Database,
): Promise<AdminSetUserPasswordOutput> {
	const userId = await getUserIdByUsername(db, input.username);
	const passwordHash = await hashPassword(input.password);

	const account = await db.account.findFirst({
		where: { userId, providerId: "credential" },
		select: { id: true },
	});

	if (account) {
		await db.account.update({
			where: { id: account.id },
			data: { password: passwordHash },
		});
	} else {
		await db.account.create({
			data: {
				userId,
				accountId: userId,
				providerId: "credential",
				password: passwordHash,
			},
		});
	}

	return { username: input.username };
}
