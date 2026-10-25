import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import { formatSittingDisplayName } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { favoriteItemSelect } from "../favorite/favorite.schema";
import { userReadListSelect } from "../read/read.schema";
import { userMemberLevelsFromPoints } from "./member-levels";
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
import {
	assertMemberVisible,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "./user-visibility";

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

export async function getUserByUsername(
	input: GetUserByUsernameInput,
	db: Database,
	session: Session | null = null,
): Promise<GetUserByUsernameOutput> {
	const viewer = viewerFromSession(session);
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { ...getUserByUsernameFields, id: true, isHidden: true },
	});

	assertMemberVisible(user, viewer);

	const [readingStreak, levels, profile] = await Promise.all([
		loadReadingStreakForUser(user.id, db),
		Promise.resolve(userMemberLevelsFromPoints(user.xp, user.rp)),
		getProfileByUserId(user.id, db),
	]);

	return {
		username: user.username,
		name: user.name,
		image: user.image,
		isAdmin: user.isAdmin,
		rp: user.rp,
		xp: user.xp,
		status: user.status,
		indexable: !user.isHidden,
		xpLevel: levels.xpLevel,
		rpLevel: levels.rpLevel,
		readingStreak,
		profile,
	};
}

export async function getUserList(
	input: GetUserListInput,
	db: Database,
): Promise<GetUserListOutput> {
	const pagination = definePagination.cursor(input, userListCursorCodec);
	const sorting = userListSorting.from(input);
	const ranging = userListRanging.from(input);
	const searching = userListSearching.from(input);

	const where = mergeWhereFragments<Prisma.UserWhereInput>(
		ranging.use(),
		searching.use(),
		visibleOnSiteUserWhere,
		{
			status: input.statuses ? { in: input.statuses } : undefined,
			isAdmin: input.isAdmin === undefined ? undefined : input.isAdmin,
		},
	);

	const rows = await db.user.findMany({
		...pagination.use(),
		where,
		orderBy: withStableUsernameOrderBy(sorting.use(), sorting.sortDirection),
		select: getUserListFields,
	});

	const page = pagination.paginate(rows);

	return {
		items: page.items.map((row) => {
			const levels = userMemberLevelsFromPoints(row.xp, row.rp);
			return {
				...row,
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
	session: Session | null = null,
): Promise<GetUserProfileCardOutput> {
	const viewer = viewerFromSession(session);
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { ...getUserByUsernameFields, id: true, isHidden: true },
	});

	assertMemberVisible(user, viewer);

	const levels = userMemberLevelsFromPoints(user.xp, user.rp);

	const [
		favorites,
		recentReads,
		readsCount,
		feedbacksCount,
		participationsCount,
		shelvesCount,
		readingStreak,
	] = await Promise.all([
		db.favorite.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: "asc" },
			take: PROFILE_CARD_BOOK_LIMIT,
			select: favoriteItemSelect,
		}),
		db.read.findMany({
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
		}),
		db.read.count({ where: { userId: user.id } }),
		db.feedback.count({ where: { authorId: user.id } }),
		db.participation.count({ where: { userId: user.id } }),
		db.shelf.count({
			where: {
				userId: user.id,
				isWishlist: false,
				...(viewer?.userId === user.id || viewer?.isAdmin
					? {}
					: { visibility: "public" as const }),
			},
		}),
		loadReadingStreakForUser(user.id, db),
	]);

	return {
		username: user.username,
		name: user.name,
		image: user.image,
		isAdmin: user.isAdmin,
		rp: user.rp,
		xp: user.xp,
		status: user.status,
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
	session: Session | null = null,
): Promise<GetUserParticipationListOutput> {
	const profileUser = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, isHidden: true, username: true },
	});

	assertMemberVisible(profileUser, viewerFromSession(session));

	const viewerId = session?.user?.id ?? null;
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
