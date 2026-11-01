import { isSuperAdmin } from "@bbrc/shared";
import { notBannedProcedure, superAdminProcedure } from "../../procedures";
import {
	CreateBookRequestInputSchema,
	CreateBookRequestOutputSchema,
	ListMyBookRequestsOutputSchema,
	ListOpenBookRequestsOutputSchema,
	ListPendingBookRequestsOutputSchema,
	RejectBookRequestInputSchema,
	RejectBookRequestOutputSchema,
	UpvoteBookRequestInputSchema,
	UpvoteBookRequestOutputSchema,
} from "./book-request.schema";
import {
	createBookRequest,
	listMyBookRequests,
	listOpenBookRequests,
	listPendingBookRequests,
	rejectBookRequest,
	setBookRequestUpvote,
} from "./book-request.service";

export const bookRequestRouter = {
	listPending: superAdminProcedure
		.output(ListPendingBookRequestsOutputSchema)
		.handler(async ({ context }) => listPendingBookRequests(context.db)),
	listOpen: notBannedProcedure
		.output(ListOpenBookRequestsOutputSchema)
		.handler(async ({ context }) =>
			listOpenBookRequests(context.session.user.id, context.db),
		),
	upvote: notBannedProcedure
		.input(UpvoteBookRequestInputSchema)
		.output(UpvoteBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			setBookRequestUpvote(input, context.session.user.id, context.db),
		),
	listMine: notBannedProcedure
		.output(ListMyBookRequestsOutputSchema)
		.handler(async ({ context }) =>
			listMyBookRequests(context.session.user.id, context.db),
		),
	create: notBannedProcedure
		.input(CreateBookRequestInputSchema)
		.output(CreateBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			createBookRequest(
				input,
				context.session.user.id,
				isSuperAdmin(context.session.user),
				context.db,
			),
		),
	reject: superAdminProcedure
		.input(RejectBookRequestInputSchema)
		.output(RejectBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			rejectBookRequest(input, context.db),
		),
};
