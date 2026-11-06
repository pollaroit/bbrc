import type { Database, Prisma } from "@bbrc/db";
import {
	activityBounds,
	cumulativeByMonth,
	rankOf,
	richContentPreview,
	type StatsRank,
	topPercent,
	type Viewer,
} from "@bbrc/shared";
import { countFriends } from "../friend/friend.service";
import { shelfVisibleWhere } from "../shelf/shelf-visibility";
import {
	postFeedWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import type {
	MemberStatsCommunityOutput,
	MemberStatsInput,
} from "./member-stats.schema";
import { loadMemberStatsContext } from "./member-stats-context";
import { createdAtRangeOfBounds } from "./member-stats-helpers";

const withPercent = (rank: StatsRank | null) =>
	rank ? { ...rank, topPercent: topPercent(rank) } : null;

/** The number of rows each member has, everyone included: what a rank is worked out over. */
function countsOf(groups: { _count: { _all: number } }[]): number[] {
	return groups.map((group) => group._count._all);
}

export async function getMemberStatsCommunity(
	db: Database,
	viewer: Viewer,
	input: MemberStatsInput,
): Promise<MemberStatsCommunityOutput> {
	const ctx = await loadMemberStatsContext(db, input, viewer);
	const { access, period, bounds, hasTimeAxis } = ctx;
	const userId = ctx.member.id;

	const fixedRange = hasTimeAxis && period.type !== "life";
	const range = fixedRange ? { createdAt: createdAtRangeOfBounds(bounds) } : {};

	const [
		reviewRows,
		reviewCounts,
		postRows,
		postCounts,
		shelfRows,
		shelfCounts,
		friendCount,
	] = await Promise.all([
		access.reviews
			? db.feedback.findMany({
					where: {
						AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
						authorId: userId,
						...range,
					},
					select: {
						slug: true,
						rating: true,
						createdAt: true,
						book: {
							select: {
								id: true,
								slug: true,
								title: true,
								authors: true,
								coverId: true,
							},
						},
						_count: { select: { likes: true, comments: true } },
					},
				})
			: Promise.resolve([]),
		access.reviews
			? db.feedback.groupBy({
					by: ["authorId"],
					where: range,
					_count: { _all: true },
				})
			: Promise.resolve([]),
		db.post.findMany({
			where: {
				AND: [postFeedWhere(viewer) as Prisma.PostWhereInput],
				authorId: userId,
				...range,
			},
			select: {
				slug: true,
				content: true,
				createdAt: true,
				poll: { select: { id: true } },
				tierlist: { select: { id: true } },
				_count: { select: { likes: true, comments: true } },
			},
		}),
		db.post.groupBy({
			by: ["authorId"],
			where: { status: "published", ...range },
			_count: { _all: true },
		}),
		db.shelf.findMany({
			where: {
				AND: [shelfVisibleWhere(viewer, { listing: true })],
				userId,
				...range,
			},
			select: {
				slug: true,
				title: true,
				viewCount: true,
				user: { select: { username: true } },
				_count: { select: { books: true } },
			},
		}),
		db.shelf.groupBy({
			by: ["userId"],
			where: { isWishlist: false, ...range },
			_count: { _all: true },
		}),
		countFriends(db, userId),
	]);

	const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

	const reviews = access.reviews
		? {
				count: reviewRows.length,
				average: reviewRows.length
					? Math.round(
							(sum(reviewRows.map((row) => row.rating)) / reviewRows.length) *
								10,
						) / 10
					: null,
				spread: [1, 2, 3, 4, 5].map((star) => ({
					label: `${star}★`,
					count: reviewRows.filter((row) => Math.round(row.rating) === star)
						.length,
				})),
				likes: sum(reviewRows.map((row) => row._count.likes)),
				comments: sum(reviewRows.map((row) => row._count.comments)),
				cumulative: cumulativeByMonth(
					reviewRows.map((row) => row.createdAt),
					activityBounds(
						reviewRows.map((row) => row.createdAt),
						bounds,
						fixedRange,
					),
					"en-US",
				),
				top: [...reviewRows]
					.map((row) => ({
						slug: row.slug,
						book: row.book,
						rating: row.rating,
						likes: row._count.likes,
						comments: row._count.comments,
					}))
					.filter((row) => row.likes + row.comments > 0)
					.sort(
						(a, b) =>
							b.likes + b.comments - (a.likes + a.comments) ||
							b.likes - a.likes,
					)
					.slice(0, 5),
				rank: withPercent(rankOf(reviewRows.length, countsOf(reviewCounts))),
			}
		: null;

	const posts = {
		count: postRows.length,
		likes: sum(postRows.map((row) => row._count.likes)),
		comments: sum(postRows.map((row) => row._count.comments)),
		polls: postRows.filter((row) => row.poll).length,
		tierlists: postRows.filter((row) => row.tierlist).length,
		cumulative: cumulativeByMonth(
			postRows.map((row) => row.createdAt),
			activityBounds(
				postRows.map((row) => row.createdAt),
				bounds,
				fixedRange,
			),
			"en-US",
		),
		top: [...postRows]
			.map((row) => ({
				slug: row.slug,
				preview: richContentPreview(row.content, 110),
				likes: row._count.likes,
				comments: row._count.comments,
			}))
			.filter((row) => row.likes + row.comments > 0)
			.sort(
				(a, b) =>
					b.likes + b.comments - (a.likes + a.comments) || b.likes - a.likes,
			)
			.slice(0, 5),
		rank: withPercent(rankOf(postRows.length, countsOf(postCounts))),
	};

	const shelves = {
		count: shelfRows.length,
		books: sum(shelfRows.map((row) => row._count.books)),
		top: [...shelfRows]
			.map((row) => ({
				slug: row.slug,
				title: row.title,
				username: row.user.username,
				books: row._count.books,
				views: row.viewCount,
			}))
			.sort((a, b) => b.books - a.books || b.views - a.views)
			.slice(0, 5),
		rank: withPercent(rankOf(shelfRows.length, countsOf(shelfCounts))),
	};

	return {
		access,
		reviews,
		posts,
		shelves,
		friends: { count: friendCount },
	};
}
