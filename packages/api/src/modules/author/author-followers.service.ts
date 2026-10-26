import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { mergeWhereFragments } from "../../utils/searching";
import { buildItems, userListSelect } from "../people/people.service";
import {
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	AuthorFollowersInput,
	AuthorFollowersOutput,
} from "./author.schema";
import { byAuthor, dayRangeWhere, memberSearchWhere } from "./author-activity";
import {
	loadFollowInfo,
	offsetMetadata,
	parseOffsetCursor,
} from "./author-data";
import { resolveAuthor } from "./author-resolve";

type FollowerRow = {
	userId: string;
	username: string;
	name: string;
	joinedAt: number;
	followedAt: number;
	reads: number;
	reviews: number;
	authorReads: number;
};

/** Sorts followers; ties fall back to the username so the order is stable. */
export function sortFollowers(
	rows: readonly FollowerRow[],
	sortBy: AuthorFollowersInput["sortBy"],
	direction: "asc" | "desc",
): FollowerRow[] {
	const factor = direction === "asc" ? 1 : -1;
	const value = (row: FollowerRow): number | string => {
		switch (sortBy) {
			case "name":
				return row.name.toLocaleLowerCase();
			case "username":
				return row.username.toLocaleLowerCase();
			case "joinedAt":
				return row.joinedAt;
			case "reads":
				return row.reads;
			case "reviews":
				return row.reviews;
			case "authorReads":
				return row.authorReads;
			default:
				return row.followedAt;
		}
	};
	return rows.toSorted((a, b) => {
		const left = value(a);
		const right = value(b);
		if (left !== right) {
			const compared =
				typeof left === "string" && typeof right === "string"
					? left.localeCompare(right)
					: Number(left) - Number(right);
			if (compared !== 0) return compared * factor;
		}
		return a.username.localeCompare(b.username);
	});
}

export async function getAuthorFollowers(
	input: AuthorFollowersInput,
	db: Database,
	session: Session | null,
): Promise<AuthorFollowersOutput> {
	const viewer = viewerFromSession(session);
	const author = await resolveAuthor(db, input.slug, viewer);
	const isAdmin = Boolean(viewer?.isAdmin);

	const followed = dayRangeWhere(input.followedFrom, input.followedTo);
	const memberWhere = mergeWhereFragments<Prisma.UserWhereInput>(
		visibleOnSiteUserWhere,
		// Banned members are only ever listed for administrators.
		isAdmin ? {} : { status: { not: "banned" } },
		input.search?.trim() ? memberSearchWhere(input.search.trim()) : {},
		input.location
			? {
					profile: {
						location: { contains: input.location, mode: "insensitive" },
					},
				}
			: {},
		input.hasBio ? { profile: { bio: { not: null } } } : {},
		input.hasAvatar ? { image: { not: null } } : {},
		input.readAuthor ? { reads: { some: { book: byAuthor(author.id) } } } : {},
		input.reviewedAuthor
			? { feedbacks: { some: { book: byAuthor(author.id) } } }
			: {},
	);

	const [follows, followInfo] = await Promise.all([
		db.follow.findMany({
			where: {
				targetType: "author",
				authorId: author.id,
				follower: memberWhere,
				...(followed ? { createdAt: followed } : {}),
			},
			select: {
				createdAt: true,
				follower: {
					select: {
						id: true,
						username: true,
						name: true,
						createdAt: true,
						_count: { select: { reads: true, feedbacks: true } },
					},
				},
			},
		}),
		loadFollowInfo(db, [author.id], null),
	]);
	const followerCount = followInfo.counts.get(author.id) ?? 0;

	const ids = follows.map((row) => row.follower.id);
	const [authorReads, authorReviews] =
		ids.length === 0
			? [[], []]
			: await Promise.all([
					db.read.groupBy({
						by: ["userId"],
						where: { userId: { in: ids }, book: byAuthor(author.id) },
						_count: { _all: true },
					}),
					db.feedback.groupBy({
						by: ["authorId"],
						where: { authorId: { in: ids }, book: byAuthor(author.id) },
						_count: { _all: true },
					}),
				]);
	const readsByUser = new Map(
		authorReads.map((row) => [row.userId, row._count._all]),
	);
	const reviewsByUser = new Map(
		authorReviews.map((row) => [row.authorId, row._count._all]),
	);

	const rows: FollowerRow[] = follows.map((row) => ({
		userId: row.follower.id,
		username: row.follower.username,
		name: row.follower.name,
		joinedAt: row.follower.createdAt.getTime(),
		followedAt: row.createdAt.getTime(),
		reads: row.follower._count.reads,
		reviews: row.follower._count.feedbacks,
		authorReads: readsByUser.get(row.follower.id) ?? 0,
	}));
	const followedAtByUser = new Map(
		follows.map((row) => [row.follower.id, row.createdAt]),
	);

	const sorted = sortFollowers(rows, input.sortBy, input.sortDirection);
	const skip = parseOffsetCursor(input.cursor);
	const pageRows = sorted.slice(skip, skip + input.limit);

	const people = await db.user.findMany({
		where: { id: { in: pageRows.map((row) => row.userId) } },
		select: userListSelect,
	});
	const order = new Map(pageRows.map((row, index) => [row.userId, index]));
	people.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
	const cards = await buildItems(people, db);

	return {
		followerCount,
		items: cards.map((card) => ({
			...card,
			followedAt: (followedAtByUser.get(card.id) ?? new Date(0)).toISOString(),
			authorReads: readsByUser.get(card.id) ?? 0,
			authorReviews: reviewsByUser.get(card.id) ?? 0,
		})),
		metadata: offsetMetadata({
			limit: input.limit,
			skip,
			shown: pageRows.length,
			hasNextPage: skip + pageRows.length < sorted.length,
			total: sorted.length,
		}),
	};
}
