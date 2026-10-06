import type { Database } from "@bbrc/db";
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

async function topUsersByXp(db: Database): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
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

async function topUsersByRp(db: Database): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
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

async function newestMembers(db: Database): Promise<UserRankingItem[]> {
	const rows = await db.user.findMany({
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

export async function loadAdminUserRankings(db: Database) {
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
		topUsersByXp(db),
		topUsersByRp(db),
		topUsersByRelationCount(db, "posts"),
		topUsersByRelationCount(db, "comments"),
		topUsersByRelationCount(db, "likes"),
		topUsersByRelationCount(db, "feedbacks"),
		topUsersByRelationCount(db, "participations"),
		topUsersByRelationCount(db, "favorites"),
		topUsersByRelationCount(db, "shelves"),
		topUsersByRelationCount(db, "bookRequests"),
		newestMembers(db),
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
