import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	GetBookReadStateInputSchema,
	GetBookReadStateOutputSchema,
	ListBookReadsInputSchema,
	ListBookReadsOutputSchema,
	ListUserReadsInputSchema,
	ListUserReadsOutputSchema,
	RemoveReadInputSchema,
	RemoveReadOutputSchema,
	SearchWorkEditionsInputSchema,
	SearchWorkEditionsOutputSchema,
	SetReadInputSchema,
} from "./read.schema";
import {
	getBookReadState,
	listBookReads,
	listUserReads,
	removeRead,
	searchWorkEditionsForBook,
	setRead,
} from "./read.service";

export const readRouter = {
	listForBook: publicProcedure
		.input(ListBookReadsInputSchema)
		.output(ListBookReadsOutputSchema)
		.handler(({ context, input }) => listBookReads(input, context.db)),

	listForUser: publicProcedure
		.input(ListUserReadsInputSchema)
		.output(ListUserReadsOutputSchema)
		.handler(({ context, input }) =>
			listUserReads(input, context.db, context.session),
		),

	searchEditions: publicProcedure
		.input(SearchWorkEditionsInputSchema)
		.output(SearchWorkEditionsOutputSchema)
		.handler(({ context, input }) =>
			searchWorkEditionsForBook(input, context.db),
		),
	getBookReadState: protectedProcedure
		.input(GetBookReadStateInputSchema)
		.output(GetBookReadStateOutputSchema)
		.handler(({ context, input }) =>
			getBookReadState(input.bookSlug, context.session.user.id, context.db),
		),

	setRead: protectedProcedure
		.input(SetReadInputSchema)
		.output(GetBookReadStateOutputSchema)
		.handler(({ context, input }) =>
			setRead(input, context.session.user.id, context.db),
		),

	removeRead: protectedProcedure
		.input(RemoveReadInputSchema)
		.output(RemoveReadOutputSchema)
		.handler(({ context, input }) =>
			removeRead(input, context.session.user.id, context.db),
		),
};
