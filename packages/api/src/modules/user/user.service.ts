import type { Database, Prisma } from "@bbrc/db";
import { formatSittingDisplayName, type Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { favoriteItemSelect } from "../favorite/favorite.schema";
import { countFriends } from "../friend/friend.service";
import { userReadListSelect } from "../read/read.schema";
import { memberListVisibleWhere } from "../visibility/visibility-resources";
import {
	assertMayViewMember,
	assertMemberAvailable,
	mayViewProfile,
	mayViewSection,
	memberAccessSelect,
	viewerIsAdmin,
	viewerUserId,
} from "./member-access";
import { userMemberLevelsFromPoints } from "./member-levels";
import { gateProfileDetails } from "./profile-details";
import { loadReadingStreakForUser } from "./reading-streak";
import {
	userListRanging,
	userListSearching,
	userListSorting,
} from "./user.listing";
import {
	type GetUserByUsernameInput,
	type GetUserByUsernameOutput,
	type GetUserListInput,
	type GetUserListOutput,
	type GetUserParticipationListInput,
	type GetUserParticipationListOutput,
	type GetUserProfileCardInput,
	type GetUserProfileCardOutput,
	getUserByUsernameFields,
	getUserListFields,
	getUserParticipationListFields,
	type UpdateUserStatusInput,
	type UpdateUserStatusOutput,
} from "./user.schema";
import {
	userParticipationListRanging,
	userParticipationListSearching,
	userParticipationListSorting,
} from "./user-participation.listing";
import { getProfileByUserId } from "./user-profile.service";

type UserListRow = Prisma.UserGetPayload<{ select: typeof getUserListFields }>;

const userListCursorCodec = {
	decode(cursor: string): { username: string } {
		return { username: cursor };
	},
	encode(item: UserListRow): string {
		return item.username;
	},
};

type UserParticipationListRow = Prisma.ParticipationGetPayload<{
	select: typeof getUserParticipationListFields;
}>;

const userParticipationListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: UserParticipationListRow): string {
		return item.id;
	},
};

/** Tie-break cursor pages when the primary sort field is not unique. */
function withStableUsernameOrderBy(
	orderBy: Prisma.UserOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput[] {
	return [orderBy, { username: sortDirection }];
}

const EMPTY_STREAK = {
	current: 0,
	best: 0,
	asOfSittingSlug: null,
	sittings: [],
};

export async function getUserByUsername(
	input: GetUserByUsernameInput,
	db: Database,
	viewer: Viewer,
): Promise<GetUserByUsernameOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { ...getUserByUsernameFields, id: true },
	});

	// Missing or blocked either way reads as "not found".
	assertMemberAvailable(user, viewer, input.username);

	const mayView = mayViewProfile(viewer, user);
	const [readingStreak, profile, friendCount] = await Promise.all([
		mayView
			? loadReadingStreakForUser(user.id, db)
			: Promise.resolve(EMPTY_STREAK),
		getProfileByUserId(user.id, db),
		countFriends(db, user.id),
	]);
	const levels = userMemberLevelsFromPoints(
		mayView ? user.xp : 0,
		mayView ? user.rp : 0,
	);

	return {
		username: user.username,
		name: user.name,
		image: user.image,
		isAdmin: user.isAdmin,
		rp: mayView ? user.rp : 0,
		xp: mayView ? user.xp : 0,
		status: user.status,
		indexable: user.profileVisibility === "public",
		isPrivate: user.profileVisibility === "private",
		canViewProfile: mayView,
		friendCount,
		xpLevel: levels.xpLevel,
		rpLevel: levels.rpLevel,
		readingStreak,
		profile: gateProfileDetails(profile, user, viewer),
	};
}

export async function getUserList(
	input: GetUserListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetUserListOutput> {
	const pagination = definePagination.cursor(input, userListCursorCodec);
	const sorting = userListSorting.from(input);
	const ranging = userListRanging.from(input);
	const searching = userListSearching.from(input);

	const where = mergeWhereFragments<Prisma.UserWhereInput>(
		ranging.use(),
		searching.use(),
		memberListVisibleWhere(viewer) as Prisma.UserWhereInput,
		{
			status: input.statuses ? { in: input.statuses } : undefined,
			isAdmin: input.isAdmin === undefined ? undefined : input.isAdmin,
		},
	);

	// Sorting and paging include every member; only the numbers of a private member
	// the viewer may not see into are blanked.
	const rows = await db.user.findMany({
		...pagination.use(),
		where,
		orderBy: withStableUsernameOrderBy(sorting.use(), sorting.sortDirection),
		select: getUserListFields,
	});

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => {
			const mayView = mayViewProfile(viewer, row);
			const levels = userMemberLevelsFromPoints(
				mayView ? row.xp : 0,
				mayView ? row.rp : 0,
			);
			return {
				id: row.id,
				username: row.username,
				name: row.name,
				image: row.image,
				isAdmin: row.isAdmin,
				status: row.status,
				xp: mayView ? row.xp : 0,
				rp: mayView ? row.rp : 0,
				isPrivate: row.profileVisibility === "private",
				xpLevel: levels.xpLevel,
				rpLevel: levels.rpLevel,
			};
		}),
		metadata: page.metadata,
	};
}

const PROFILE_CARD_BOOK_LIMIT = 4;

export async function getUserProfileCard(
	input: GetUserProfileCardInput,
	db: Database,
	viewer: Viewer,
): Promise<GetUserProfileCardOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { ...getUserByUsernameFields, id: true },
	});

	assertMemberAvailable(user, viewer, input.username);

	const mayView = mayViewProfile(viewer, user);
	const mayReads = mayViewSection(viewer, user, "reads");
	const mayFavorites = mayViewSection(viewer, user, "favorites");
	const mayReviews = mayViewSection(viewer, user, "reviews");
	const levels = userMemberLevelsFromPoints(
		mayView ? user.xp : 0,
		mayView ? user.rp : 0,
	);
	const isOwnerOrAdmin =
		viewerIsAdmin(viewer) || viewerUserId(viewer) === user.id;

	const [
		favorites,
		recentReads,
		readsCount,
		feedbacksCount,
		participationsCount,
		shelvesCount,
		readingStreak,
		friendCount,
	] = await Promise.all([
		mayFavorites
			? db.favorite.findMany({
					where: { userId: user.id },
					orderBy: { createdAt: "asc" },
					take: PROFILE_CARD_BOOK_LIMIT,
					select: favoriteItemSelect,
				})
			: Promise.resolve([]),
		mayReads
			? db.read.findMany({
					where: {
						userId: user.id,
						readEndYear: { not: null },
						readEndMonth: { not: null },
					},
					orderBy: [
						{ readEndYear: "desc" },
						{ readEndMonth: "desc" },
						{ createdAt: "desc" },
					],
					take: PROFILE_CARD_BOOK_LIMIT,
					select: userReadListSelect,
				})
			: Promise.resolve([]),
		mayReads ? db.read.count({ where: { userId: user.id } }) : 0,
		mayReviews ? db.feedback.count({ where: { authorId: user.id } }) : 0,
		mayView ? db.participation.count({ where: { userId: user.id } }) : 0,
		mayView
			? db.shelf.count({
					where: {
						userId: user.id,
						isWishlist: false,
						...(isOwnerOrAdmin
							? {}
							: {
									visibility: {
										in:
											viewer.kind === "member" && viewer.friendIds.has(user.id)
												? (["public", "friends"] as const)
												: (["public"] as const),
									},
								}),
					},
				})
			: 0,
		mayView ? loadReadingStreakForUser(user.id, db) : EMPTY_STREAK,
		countFriends(db, user.id),
	]);

	return {
		username: user.username,
		name: user.name,
		image: user.image,
		isAdmin: user.isAdmin,
		rp: mayView ? user.rp : 0,
		xp: mayView ? user.xp : 0,
		status: user.status,
		isPrivate: user.profileVisibility === "private",
		canViewProfile: mayView,
		friendCount,
		xpLevel: levels.xpLevel,
		rpLevel: levels.rpLevel,
		readingStreak,
		favorites: favorites.map((row) => ({
			id: row.id,
			book: {
				slug: row.book.slug,
				title: row.book.title,
				coverId: row.book.coverId,
			},
		})),
		recentReads: recentReads.map((row) => ({
			book: {
				slug: row.book.slug,
				title: row.book.title,
				coverId: row.book.coverId,
			},
		})),
		stats: {
			readsCount,
			feedbacksCount,
			participationsCount,
			shelvesCount,
		},
		generatedAt: new Date(),
	};
}

export async function getUserParticipationList(
	input: GetUserParticipationListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetUserParticipationListOutput> {
	const profileUser = await db.user.findUnique({
		where: { username: input.username },
		select: { ...memberAccessSelect, username: true },
	});

	// Sitting history follows the profile level.
	assertMayViewMember(profileUser, viewer, { username: input.username });

	const viewerId = viewerUserId(viewer);
	if (input.mutualOnly && !viewerId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by mutual sittings.",
		});
	}

	const pagination = definePagination.cursor(
		input,
		userParticipationListCursorCodec,
	);
	const sorting = userParticipationListSorting.from(input);
	const ranging = userParticipationListRanging.from(input);
	const searching = userParticipationListSearching.from(input);

	// Prisma cannot filter on a relation count, so resolve matching sittings first.
	let participantCountWhere: Prisma.ParticipationWhereInput = {};
	if (input.minParticipants != null || input.maxParticipants != null) {
		const groups = await db.participation.groupBy({
			by: ["sittingId"],
			where: { removedAt: null },
			having: {
				id: {
					_count: {
						...(input.minParticipants != null
							? { gte: input.minParticipants }
							: {}),
						...(input.maxParticipants != null
							? { lte: input.maxParticipants }
							: {}),
					},
				},
			},
		});
		participantCountWhere = {
			sittingId: { in: groups.map((group) => group.sittingId) },
		};
	}

	const where = mergeWhereFragments<Prisma.ParticipationWhereInput>(
		{ userId: profileUser.id },
		// Removed members only stay on their history when they were marked DNF.
		{ OR: [{ removedAt: null }, { progress: "dnf" }] },
		ranging.use(),
		searching.use(),
		participantCountWhere,
		input.statuses?.length
			? { sitting: { status: { in: input.statuses } } }
			: {},
		input.progresses?.length ? { progress: { in: input.progresses } } : {},
		input.mutualOnly && viewerId
			? {
					sitting: {
						participants: { some: { userId: viewerId, removedAt: null } },
					},
				}
			: {},
	);

	const isFirstPage = input.cursor == null;

	const [rows, total] = await Promise.all([
		db.participation.findMany({
			...pagination.use(),
			where,
			orderBy: [sorting.use(), { id: sorting.sortDirection }],
			select: getUserParticipationListFields,
		}),
		isFirstPage
			? db.participation.count({ where })
			: Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);

	const viewerSittingIds = new Set<string>();
	if (viewerId) {
		const mine = await db.participation.findMany({
			where: {
				userId: viewerId,
				sittingId: { in: page.items.map((row) => row.sitting.id) },
			},
			select: { sittingId: true },
		});
		for (const row of mine) viewerSittingIds.add(row.sittingId);
	}

	return {
		items: page.items.map((row) => ({
			id: row.id,
			progress: row.progress,
			updatedAt: row.updatedAt,
			viewerParticipates: viewerSittingIds.has(row.sitting.id),
			sitting: {
				poll: row.sitting.poll,
				slug: row.sitting.slug,
				status: row.sitting.status,
				deadline: row.sitting.deadline,
				createdAt: row.sitting.createdAt,
				participantCount: row.sitting._count.participants,
				displayName: formatSittingDisplayName(
					row.sitting.slug,
					row.sitting.status,
					row.sitting.selectedBook?.title,
				),
				selectedBook: row.sitting.selectedBook,
			},
		})),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function updateUserStatus(
	input: UpdateUserStatusInput,
	db: Database,
): Promise<UpdateUserStatusOutput> {
	try {
		return await db.user.update({
			where: { username: input.username },
			data: { status: input.status },
			select: {
				username: true,
				status: true,
			},
		});
	} catch {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}
}
