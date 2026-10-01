import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
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
	getUserByUsernameFields,
	getUserListFields,
	getUserParticipationListFields,
	type UpdateUserStatusInput,
	type UpdateUserStatusOutput,
} from "./user.schema";

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
): Promise<GetUserByUsernameOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: getUserByUsernameFields,
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: `User with ${input.username} username not found. Please check the username and try again.`,
			data: { username: input.username },
		});
	}

	return user;
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

	return pagination.paginate(rows);
}

export async function getUserParticipationList(
	input: GetUserParticipationListInput,
	db: Database,
): Promise<GetUserParticipationListOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	const pagination = definePagination.cursor(
		input,
		userParticipationListCursorCodec,
	);

	const rows = await db.participation.findMany({
		...pagination.use(),
		where: { userId: user.id },
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		select: getUserParticipationListFields,
	});

	return pagination.paginate(rows);
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
