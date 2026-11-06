import { canManageBooks } from "@bbrc/shared";
import { minRoleProcedure, protectedProcedure } from "../../procedures";
import { audited } from "../audit/audit-middleware";
import { bookRequestBefore, namedTarget } from "../audit/audit-targets";
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
	listPending: minRoleProcedure("admin")
		.output(ListPendingBookRequestsOutputSchema)
		.handler(async ({ context }) => listPendingBookRequests(context.db)),
	listOpen: protectedProcedure
		.output(ListOpenBookRequestsOutputSchema)
		.handler(async ({ context }) =>
			listOpenBookRequests(context.session.user.id, context.db),
		),
	upvote: protectedProcedure
		.input(UpvoteBookRequestInputSchema)
		.output(UpvoteBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			setBookRequestUpvote(input, context.session.user.id, context.db),
		),
	listMine: protectedProcedure
		.output(ListMyBookRequestsOutputSchema)
		.handler(async ({ context }) =>
			listMyBookRequests(context.session.user.id, context.db),
		),
	create: protectedProcedure
		.input(CreateBookRequestInputSchema)
		.output(CreateBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			createBookRequest(
				input,
				context.session.user.id,
				canManageBooks(context.session.user),
				context.db,
			),
		),
	reject: minRoleProcedure("admin")
		.input(RejectBookRequestInputSchema)
		.use(
			audited("request.rejected", {
				before: ({ input, db }) => bookRequestBefore(db, input.id),
				target: ({ before, input }) => namedTarget("request", before, input.id),
				metadata: ({ input }) => ({ reason: input.rejectionReason }),
			}),
		)
		.output(RejectBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			rejectBookRequest(input, context.db),
		),
};
