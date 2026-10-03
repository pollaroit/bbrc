import { adminProcedure, notBannedProcedure } from "../../procedures";
import {
	CreateBookRequestInputSchema,
	CreateBookRequestOutputSchema,
	ListMyBookRequestsOutputSchema,
	ListPendingBookRequestsOutputSchema,
	RejectBookRequestInputSchema,
	RejectBookRequestOutputSchema,
} from "./book-request.schema";
import {
	createBookRequest,
	listMyBookRequests,
	listPendingBookRequests,
	rejectBookRequest,
} from "./book-request.service";

export const bookRequestRouter = {
	listPending: adminProcedure
		.output(ListPendingBookRequestsOutputSchema)
		.handler(async ({ context }) => listPendingBookRequests(context.db)),
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
				context.session.user.isAdmin,
				context.db,
			),
		),
	reject: adminProcedure
		.input(RejectBookRequestInputSchema)
		.output(RejectBookRequestOutputSchema)
		.handler(async ({ input, context }) =>
			rejectBookRequest(input, context.db),
		),
};
