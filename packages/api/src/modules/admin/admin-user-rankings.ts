import type { Database, Prisma } from "@bbrc/db";
import type { z } from "zod";
import type { AdminUserRankingItemSchema } from "./admin-user.schema";

type UserRankingItem = z.infer<typeof AdminUserRankingItemSchema>;

const RANKING_LIMIT = 5;

const userRankingSelect = {
	username: true,
	name: true,
	image: true,
} as const;

function mapUserRow(row: {
	username: string;
	name: string;
	image: string | null;
	metric: number;
	secondaryMetric?: number;
}): UserRankingItem {
	return {
		username: row.username,
		name: row.name,
		image: row.image,
		metric: row.metric,
		secondaryMetric: row.secondaryMetric,
	};
}

async function topUsersByXp(
	db: Database,
	where: Prisma.UserWhereInput,
): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
		where,
		orderBy: { xp: "desc" },
		take: RANKING_LIMIT,
		select: { ...userRankingSelect, xp: true },
	});

	return rows.map((row) =>
		mapUserRow({
			username: row.username,
			name: row.name,
			image: row.image,
			metric: row.xp,
		}),
	);
}

async function topUsersByRp(
	db: Database,
	where: Prisma.UserWhereInput,
): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
		where,
		orderBy: { rp: "desc" },
		take: RANKING_LIMIT,
		select: { ...userRankingSelect, rp: true },
	});

	return rows.map((row) =>
		mapUserRow({
			username: row.username,
			name: row.name,
			image: row.image,
			metric: row.rp,
		}),
	);
}

async function topUsersByRelationCount(
	db: Database,
	where: Prisma.UserWhereInput,
	relation:
		| "posts"
		| "comments"
		| "likes"
		| "feedbacks"
		| "participations"
		| "favorites"
		| "shelves"
		| "bookRequests",
): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
		where,
		orderBy: { [relation]: { _count: "desc" } },
		take: RANKING_LIMIT,
		select: {
			...userRankingSelect,
			_count: { select: { [relation]: true } },
		},
	});

	return rows.map((row) => {
		const metric =
			relation === "posts"
				? row._count.posts
				: relation === "comments"
					? row._count.comments
					: relation === "likes"
						? row._count.likes
						: relation === "feedbacks"
							? row._count.feedbacks
							: relation === "participations"
								? row._count.participations
								: relation === "favorites"
									? row._count.favorites
									: relation === "shelves"
										? row._count.shelves
										: row._count.bookRequests;

		return mapUserRow({
			username: row.username,
			name: row.name,
			image: row.image,
			metric: metric ?? 0,
		});
	});
}

async function newestMembers(
	db: Database,
	where: Prisma.UserWhereInput,
): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
		where,
		orderBy: { createdAt: "desc" },
		take: RANKING_LIMIT,
		select: { ...userRankingSelect, createdAt: true },
	});

	return rows.map((row) =>
		mapUserRow({
			username: row.username,
			name: row.name,
			image: row.image,
			metric: row.createdAt.getTime(),
		}),
	);
}

export function emptyAdminUserRankings() {
	return {
		mostXp: [] as UserRankingItem[],
		mostRp: [] as UserRankingItem[],
		mostPosts: [] as UserRankingItem[],
		mostComments: [] as UserRankingItem[],
		mostLikes: [] as UserRankingItem[],
		mostFeedbacks: [] as UserRankingItem[],
		mostParticipations: [] as UserRankingItem[],
		mostFavorites: [] as UserRankingItem[],
		mostShelves: [] as UserRankingItem[],
		mostBookRequests: [] as UserRankingItem[],
		newestMembers: [] as UserRankingItem[],
	};
}

export async function loadAdminUserRankings(
	db: Database,
	where: Prisma.UserWhereInput = {},
) {
	const [
		mostXp,
		mostRp,
		mostPosts,
		mostComments,
		mostLikes,
		mostFeedbacks,
		mostParticipations,
		mostFavorites,
		mostShelves,
		mostBookRequests,
		newestMembersList,
	] = await Promise.all([
		topUsersByXp(db, where),
		topUsersByRp(db, where),
		topUsersByRelationCount(db, where, "posts"),
		topUsersByRelationCount(db, where, "comments"),
		topUsersByRelationCount(db, where, "likes"),
		topUsersByRelationCount(db, where, "feedbacks"),
		topUsersByRelationCount(db, where, "participations"),
		topUsersByRelationCount(db, where, "favorites"),
		topUsersByRelationCount(db, where, "shelves"),
		topUsersByRelationCount(db, where, "bookRequests"),
		newestMembers(db, where),
	]);

	return {
		mostXp,
		mostRp,
		mostPosts,
		mostComments,
		mostLikes,
		mostFeedbacks,
		mostParticipations,
		mostFavorites,
		mostShelves,
		mostBookRequests,
		newestMembers: newestMembersList,
	};
}
