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
	AdminUpdateUserHiddenInput,
	AdminUpdateUserHiddenOutput,
	AdminUpdateUserNameInput,
	AdminUpdateUserNameOutput,
	AdminUpdateUserRoleInput,
	AdminUpdateUserRoleOutput,
	AdminUpdateUserStatusInput,
	AdminUpdateUserStatusOutput,
	AdminUserOverviewOutput,
	AdminUserStatsOutput,
	GetAdminUserOverviewInput,
	GetAdminUserStatsInput,
	ListAdminUsersInput,
	ListAdminUsersOutput,
} from "./admin-user.schema";
import { adminUserListSelect } from "./admin-user.schema";
import {
	emptyAdminUserRankings,
	loadAdminUserRankings,
} from "./admin-user-rankings";

type AdminUserListRow = Prisma.UserGetPayload<{
	select: typeof adminUserListSelect;
}>;

function withStableUsernameOrderBy(
	orderBy: Prisma.UserOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput[] {
	return [orderBy, { username: sortDirection }];
}

function buildSignupsByDay(
	rows: { createdAt: Date }[],
	days: number,
): { date: string; count: number }[] {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);

	const countsByDay = new Map<string, number>();
	for (let i = 0; i < days; i += 1) {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		countsByDay.set(day.toISOString().slice(0, 10), 0);
	}

	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (countsByDay.has(key)) {
			countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
		}
	}

	return [...countsByDay.entries()].map(([date, count]) => ({ date, count }));
}

function xpBucket(xp: number): string {
	if (xp <= 0) return "0";
	if (xp < 50) return "1–49";
	if (xp < 200) return "50–199";
	if (xp < 500) return "200–499";
	return "500+";
}

function rpBucket(rp: number): string {
	if (rp <= 0) return "0";
	if (rp < 25) return "1–24";
	if (rp < 100) return "25–99";
	if (rp < 300) return "100–299";
	return "300+";
}

const XP_BUCKET_ORDER = ["0", "1–49", "50–199", "200–499", "500+"];
const RP_BUCKET_ORDER = ["0", "1–24", "25–99", "100–299", "300+"];

function mapAdminUserRow(row: AdminUserListRow) {
	return {
		id: row.id,
		username: row.username,
		name: row.name,
		email: row.email,
		image: row.image,
		isAdmin: row.isAdmin,
		isHidden: row.isHidden,
		status: row.status,
		xp: row.xp,
		rp: row.rp,
		emailVerified: row.emailVerified,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		counts: {
			posts: row._count.posts,
			comments: row._count.comments,
			likes: row._count.likes,
			feedbacks: row._count.feedbacks,
			participations: row._count.participations,
			reads: row._count.reads,
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
		| "favorites"
		| "shelves"
		| "documents"
		| "bookRequests"
		| "factImpressions"
		| "reads",
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
		case "shelves": {
			const rows = await db.shelf.groupBy({
				by: ["userId"],
				where: { isWishlist: false },
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "documents": {
			const rows = await db.document.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "bookRequests": {
			const rows = await db.bookRequest.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "factImpressions": {
			const rows = await db.factImpression.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
		case "reads": {
			const rows = await db.read.groupBy({
				by: ["userId"],
				_count: { _all: true },
				having: { userId: { _count: { gte: min } } },
			});
			return rows.map((row) => row.userId);
		}
	}
}

async function userIdsWithReadsCountBounds(
	db: Database,
	min?: number,
	max?: number,
): Promise<string[] | null> {
	if (min == null && max == null) {
		return null;
	}

	const effectiveMin = min ?? 0;
	const effectiveMax = max ?? Number.POSITIVE_INFINITY;

	if (effectiveMax < effectiveMin) {
		return [];
	}

	if (effectiveMax === 0) {
		const rows = await db.user.findMany({
			where: { reads: { none: {} } },
			select: { id: true },
		});
		return rows.map((row) => row.id);
	}

	const grouped = await db.read.groupBy({
		by: ["userId"],
		_count: { _all: true },
	});

	const matched = grouped
		.filter((row) => {
			const count = row._count._all;
			return count >= effectiveMin && count <= effectiveMax;
		})
		.map((row) => row.userId);

	if (effectiveMin > 0) {
		return matched;
	}

	const withReads = new Set(grouped.map((row) => row.userId));
	const zeroReadUsers = await db.user.findMany({
		where: withReads.size > 0 ? { id: { notIn: [...withReads] } } : undefined,
		select: { id: true },
	});

	return [...matched, ...zeroReadUsers.map((row) => row.id)];
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
		{ key: "minShelves", relation: "shelves" },
		{ key: "minDocuments", relation: "documents" },
		{ key: "minBookRequests", relation: "bookRequests" },
		{ key: "minFactImpressions", relation: "factImpressions" },
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

type AdminUserListQueryInput = GetAdminUserOverviewInput | ListAdminUsersInput;

export async function buildAdminUserListWhere(
	db: Database,
	input: AdminUserListQueryInput,
): Promise<{ where: Prisma.UserWhereInput; empty: boolean }> {
	const ranging = adminUserListRanging.from(input);
	const searching = adminUserListSearching.from(input);
	let minCountIds = await resolveMinCountUserIds(
		db,
		input as ListAdminUsersInput,
	);

	const readsCountIds = await userIdsWithReadsCountBounds(
		db,
		input.minReads ?? undefined,
		input.maxReads ?? undefined,
	);
	if (readsCountIds !== null) {
		if (readsCountIds.length === 0) {
			return { where: {}, empty: true };
		}
		minCountIds = intersectIds(minCountIds, readsCountIds);
		if (minCountIds?.length === 0) {
			return { where: {}, empty: true };
		}
	}

	if (minCountIds?.length === 0) {
		return { where: {}, empty: true };
	}

	const where = mergeWhereFragments<Prisma.UserWhereInput>(
		ranging.use(),
		searching.use(),
		{
			id: minCountIds ? { in: minCountIds } : undefined,
			status: input.statuses ? { in: input.statuses } : undefined,
			isAdmin: input.isAdmin === undefined ? undefined : input.isAdmin,
			isHidden: input.isHidden === undefined ? undefined : input.isHidden,
			xp: input.minXp != null ? { gte: input.minXp } : undefined,
			rp: input.minRp != null ? { gte: input.minRp } : undefined,
		},
	);

	return { where, empty: false };
}

function emptyAdminUserOverview(
	pendingBookRequests: number,
): AdminUserOverviewOutput {
	return {
		kpis: {
			totalMembers: 0,
			admins: 0,
			active: 0,
			warned: 0,
			banned: 0,
			averageXp: 0,
			averageRp: 0,
			totalXp: 0,
			totalRp: 0,
			joinedLast7Days: 0,
			joinedLast30Days: 0,
			unverifiedEmail: 0,
			pendingBookRequests,
		},
		signupsByDay: buildSignupsByDay([], 30),
		rankings: emptyAdminUserRankings(),
	};
}

export async function listAdminUsers(
	input: ListAdminUsersInput,
	db: Database,
): Promise<ListAdminUsersOutput> {
	const pagination = definePagination.offset(input);
	const sorting = adminUserListSorting.from(input);
	const { where, empty } = await buildAdminUserListWhere(db, input);

	if (empty) {
		return pagination.paginate([], 0);
	}

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

export async function getAdminUserOverview(
	input: GetAdminUserOverviewInput,
	db: Database,
): Promise<AdminUserOverviewOutput> {
	const now = new Date();
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30);
	const chartSince = new Date(now);
	chartSince.setUTCDate(now.getUTCDate() - 29);
	chartSince.setUTCHours(0, 0, 0, 0);

	const pendingBookRequestsPromise = db.bookRequest.count({
		where: { status: "pending" },
	});

	const { where, empty } = await buildAdminUserListWhere(db, input);
	if (empty) {
		const pendingBookRequests = await pendingBookRequestsPromise;
		return emptyAdminUserOverview(pendingBookRequests);
	}

	const chartWhere = mergeWhereFragments(where, {
		createdAt: { gte: chartSince },
	});
	const joined7Where = mergeWhereFragments(where, {
		createdAt: { gte: sevenDaysAgo },
	});
	const joined30Where = mergeWhereFragments(where, {
		createdAt: { gte: thirtyDaysAgo },
	});

	const [
		totalMembers,
		adminCount,
		activeCount,
		warnedCount,
		bannedCount,
		xpAgg,
		rpAgg,
		joinedLast7Days,
		joinedLast30Days,
		unverifiedEmail,
		pendingBookRequests,
		recentUsers,
		rankings,
	] = await Promise.all([
		db.user.count({ where }),
		db.user.count({
			where: mergeWhereFragments(where, { isAdmin: true }),
		}),
		db.user.count({
			where: mergeWhereFragments(where, { status: "active" }),
		}),
		db.user.count({
			where: mergeWhereFragments(where, { status: "warned" }),
		}),
		db.user.count({
			where: mergeWhereFragments(where, { status: "banned" }),
		}),
		db.user.aggregate({ where, _avg: { xp: true }, _sum: { xp: true } }),
		db.user.aggregate({ where, _avg: { rp: true }, _sum: { rp: true } }),
		db.user.count({ where: joined7Where }),
		db.user.count({ where: joined30Where }),
		db.user.count({
			where: mergeWhereFragments(where, { emailVerified: false }),
		}),
		pendingBookRequestsPromise,
		db.user.findMany({
			where: chartWhere,
			select: { createdAt: true },
			orderBy: { createdAt: "asc" },
		}),
		loadAdminUserRankings(db, where),
	]);

	return {
		kpis: {
			totalMembers,
			admins: adminCount,
			active: activeCount,
			warned: warnedCount,
			banned: bannedCount,
			averageXp: Math.round((xpAgg._avg.xp ?? 0) * 10) / 10,
			averageRp: Math.round((rpAgg._avg.rp ?? 0) * 10) / 10,
			totalXp: xpAgg._sum.xp ?? 0,
			totalRp: rpAgg._sum.rp ?? 0,
			joinedLast7Days,
			joinedLast30Days,
			unverifiedEmail,
			pendingBookRequests,
		},
		signupsByDay: buildSignupsByDay(recentUsers, 30),
		rankings,
	};
}

function buildAdminUserStatsWhere(
	input: GetAdminUserStatsInput,
): Prisma.UserWhereInput {
	const where: Prisma.UserWhereInput = {};

	if (input.statuses?.length) {
		where.status = { in: input.statuses };
	}
	if (input.isAdmin != null) {
		where.isAdmin = input.isAdmin;
	}
	if (input.rangeMin != null || input.rangeMax != null) {
		where.createdAt = {
			...(input.rangeMin != null ? { gte: input.rangeMin } : {}),
			...(input.rangeMax != null ? { lte: input.rangeMax } : {}),
		};
	}

	return where;
}

function emptyUserStats(): AdminUserStatsOutput {
	return {
		statusDistribution: [
			{ status: "active", count: 0 },
			{ status: "warned", count: 0 },
			{ status: "banned", count: 0 },
		],
		signupsByDay: [],
		xpHistogram: [],
		rpHistogram: [],
		engagementFunnel: [
			{ stage: "Members", count: 0 },
			{ stage: "Posted", count: 0 },
			{ stage: "Commented", count: 0 },
			{ stage: "Reviewed", count: 0 },
			{ stage: "Joined sittings", count: 0 },
			{ stage: "Shelved", count: 0 },
		],
		activityTotals: [
			{ kind: "Posts", count: 0 },
			{ kind: "Comments", count: 0 },
			{ kind: "Likes", count: 0 },
			{ kind: "Feedbacks", count: 0 },
			{ kind: "Participations", count: 0 },
			{ kind: "Favorites", count: 0 },
			{ kind: "Shelves", count: 0 },
		],
		roleSplit: [
			{ kind: "Members", count: 0 },
			{ kind: "Admins", count: 0 },
		],
	};
}

export async function getAdminUserStats(
	input: GetAdminUserStatsInput,
	db: Database,
): Promise<AdminUserStatsOutput> {
	const where = buildAdminUserStatsWhere(input);

	const users = await db.user.findMany({
		where,
		select: {
			status: true,
			isAdmin: true,
			xp: true,
			rp: true,
			createdAt: true,
			_count: {
				select: {
					posts: true,
					comments: true,
					likes: true,
					feedbacks: true,
					participations: true,
					favorites: true,
					shelves: true,
				},
			},
		},
	});

	if (users.length === 0) {
		return emptyUserStats();
	}

	const statusDistribution = (["active", "warned", "banned"] as const).map(
		(status) => ({
			status,
			count: users.filter((u) => u.status === status).length,
		}),
	);

	const xpMap = new Map<string, number>();
	const rpMap = new Map<string, number>();
	let adminCount = 0;
	let postsTotal = 0;
	let commentsTotal = 0;
	let likesTotal = 0;
	let feedbacksTotal = 0;
	let participationsTotal = 0;
	let favoritesTotal = 0;
	let shelvesTotal = 0;
	let posted = 0;
	let commented = 0;
	let reviewed = 0;
	let joinedSittings = 0;
	let shelved = 0;

	for (const user of users) {
		const xpLabel = xpBucket(user.xp);
		xpMap.set(xpLabel, (xpMap.get(xpLabel) ?? 0) + 1);
		const rpLabel = rpBucket(user.rp);
		rpMap.set(rpLabel, (rpMap.get(rpLabel) ?? 0) + 1);

		if (user.isAdmin) {
			adminCount += 1;
		}

		postsTotal += user._count.posts;
		commentsTotal += user._count.comments;
		likesTotal += user._count.likes;
		feedbacksTotal += user._count.feedbacks;
		participationsTotal += user._count.participations;
		favoritesTotal += user._count.favorites;
		shelvesTotal += user._count.shelves;

		if (user._count.posts > 0) posted += 1;
		if (user._count.comments > 0) commented += 1;
		if (user._count.feedbacks > 0) reviewed += 1;
		if (user._count.participations > 0) joinedSittings += 1;
		if (user._count.shelves > 0) shelved += 1;
	}

	return {
		statusDistribution,
		signupsByDay: buildSignupsByDay(users, 30),
		xpHistogram: XP_BUCKET_ORDER.filter((label) => xpMap.has(label)).map(
			(label) => ({ label, value: xpMap.get(label) ?? 0 }),
		),
		rpHistogram: RP_BUCKET_ORDER.filter((label) => rpMap.has(label)).map(
			(label) => ({ label, value: rpMap.get(label) ?? 0 }),
		),
		engagementFunnel: [
			{ stage: "Members", count: users.length },
			{ stage: "Posted", count: posted },
			{ stage: "Commented", count: commented },
			{ stage: "Reviewed", count: reviewed },
			{ stage: "Joined sittings", count: joinedSittings },
			{ stage: "Shelved", count: shelved },
		],
		activityTotals: [
			{ kind: "Posts", count: postsTotal },
			{ kind: "Comments", count: commentsTotal },
			{ kind: "Likes", count: likesTotal },
			{ kind: "Feedbacks", count: feedbacksTotal },
			{ kind: "Participations", count: participationsTotal },
			{ kind: "Favorites", count: favoritesTotal },
			{ kind: "Shelves", count: shelvesTotal },
		],
		roleSplit: [
			{ kind: "Members", count: users.length - adminCount },
			{ kind: "Admins", count: adminCount },
		],
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

export async function adminUpdateUserHidden(
	input: AdminUpdateUserHiddenInput,
	db: Database,
): Promise<AdminUpdateUserHiddenOutput> {
	try {
		return await db.user.update({
			where: { username: input.username },
			data: { isHidden: input.isHidden },
			select: { username: true, isHidden: true },
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
