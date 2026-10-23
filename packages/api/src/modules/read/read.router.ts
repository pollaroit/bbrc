import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	GetBookReadStateInputSchema,
	GetBookReadStateOutputSchema,
	GetReadPreferencesOutputSchema,
	ListBookReadsInputSchema,
	ListBookReadsOutputSchema,
	ListUserReadsInputSchema,
	ListUserReadsOutputSchema,
	RemoveReadInputSchema,
	RemoveReadOutputSchema,
	SearchWorkEditionsInputSchema,
	SearchWorkEditionsOutputSchema,
	SetReadInputSchema,
	SetReadPreferencesInputSchema,
} from "./read.schema";
import {
	getBookReadState,
	getReadPreferences,
	listBookReads,
	listUserReads,
	removeRead,
	searchWorkEditionsForBook,
	setRead,
	setReadPreferences,
} from "./read.service";
import {
	ExportUserReadsInputSchema,
	ExportUserReadsOutputSchema,
} from "./read-export.schema";
import { exportUserReads } from "./read-export.service";

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

	exportForUser: publicProcedure
		.input(ExportUserReadsInputSchema)
		.output(ExportUserReadsOutputSchema)
		.handler(({ context, input }) =>
			exportUserReads(input, context.db, context.session),
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

	getReadPreferences: protectedProcedure
		.output(GetReadPreferencesOutputSchema)
		.handler(({ context }) =>
			getReadPreferences(context.session.user.id, context.db),
		),

	setReadPreferences: protectedProcedure
		.input(SetReadPreferencesInputSchema)
		.output(GetReadPreferencesOutputSchema)
		.handler(({ context, input }) =>
			setReadPreferences(input, context.session.user.id, context.db),
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
