import { protectedProcedure, publicProcedure } from "../../procedures";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	FriendBadgeOutputSchema,
	FriendsWhoReadInputSchema,
	FriendsWhoReadOutputSchema,
	FriendUsernameInputSchema,
	GetFriendStateOutputSchema,
	ListBlockedOutputSchema,
	ListFriendRequestsOutputSchema,
	ListFriendsInputSchema,
	ListFriendsOutputSchema,
	OkSchema,
	SendFriendRequestOutputSchema,
} from "./friend.schema";
import {
	acceptRequest,
	blockMember,
	cancelFriendRequest,
	countIncomingRequests,
	declineRequest,
	friendsWhoReadBook,
	getFriendState,
	listBlocked,
	listFriendRequests,
	listFriends,
	removeFriend,
	sendFriendRequest,
	unblockMember,
} from "./friend.service";

export const friendRouter = {
	/** How the viewer stands to a member (the friend button). */
	state: publicProcedure
		.input(FriendUsernameInputSchema)
		.output(GetFriendStateOutputSchema)
		.handler(async ({ input, context }) =>
			getFriendState(
				context.db,
				await loadViewer(context.db, context.session),
				input.username,
			),
		),
	list: publicProcedure
		.input(ListFriendsInputSchema)
		.output(ListFriendsOutputSchema)
		.handler(async ({ input, context }) =>
			listFriends(
				context.db,
				await loadViewer(context.db, context.session),
				input,
			),
		),
	/** Friends who read a book or are reading it now (for the book page). */
	whoRead: publicProcedure
		.input(FriendsWhoReadInputSchema)
		.output(FriendsWhoReadOutputSchema)
		.handler(async ({ input, context }) =>
			friendsWhoReadBook(
				context.db,
				await loadViewer(context.db, context.session),
				input.bookSlug,
			),
		),
	requests: protectedProcedure
		.output(ListFriendRequestsOutputSchema)
		.handler(({ context }) =>
			listFriendRequests(context.db, context.session.user.id),
		),
	badge: protectedProcedure
		.output(FriendBadgeOutputSchema)
		.handler(async ({ context }) => ({
			incoming: await countIncomingRequests(
				context.db,
				context.session.user.id,
			),
		})),
	blocked: protectedProcedure
		.output(ListBlockedOutputSchema)
		.handler(({ context }) => listBlocked(context.db, context.session.user.id)),
	send: protectedProcedure
		.use(checkAchievementsAfter("friends"))
		.input(FriendUsernameInputSchema)
		.output(SendFriendRequestOutputSchema)
		.handler(({ input, context }) =>
			sendFriendRequest(context.db, context.session.user.id, input.username),
		),
	cancel: protectedProcedure
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			cancelFriendRequest(context.db, context.session.user.id, input.username),
		),
	accept: protectedProcedure
		.use(checkAchievementsAfter("friends"))
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			acceptRequest(context.db, context.session.user.id, input.username),
		),
	decline: protectedProcedure
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			declineRequest(context.db, context.session.user.id, input.username),
		),
	remove: protectedProcedure
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			removeFriend(context.db, context.session.user.id, input.username),
		),
	block: protectedProcedure
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			blockMember(context.db, context.session.user.id, input.username),
		),
	unblock: protectedProcedure
		.input(FriendUsernameInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			unblockMember(context.db, context.session.user.id, input.username),
		),
};
