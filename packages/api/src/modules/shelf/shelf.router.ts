import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	AddBookToShelfInputSchema,
	AddBookToShelfOutputSchema,
	CreateShelfInputSchema,
	CreateShelfOutputSchema,
	DeleteShelfInputSchema,
	DeleteShelfOutputSchema,
	GetShelfBySlugInputSchema,
	GetShelfBySlugOutputSchema,
	ListMyEditableShelvesOutputSchema,
	ListShelvesByUsernameInputSchema,
	ListShelvesByUsernameOutputSchema,
	ListShelvesForBookInputSchema,
	ListShelvesForBookOutputSchema,
	RemoveBookFromShelfInputSchema,
	RemoveBookFromShelfOutputSchema,
	ReorderShelfBooksInputSchema,
	ReorderShelfBooksOutputSchema,
	UpdateShelfInputSchema,
	UpdateShelfOutputSchema,
} from "./shelf.schema";
import {
	addBookToShelf,
	createShelf,
	deleteShelf,
	getShelfBySlug,
	listMyEditableShelves,
	listShelvesByUsername,
	listShelvesForBook,
	removeBookFromShelf,
	reorderShelfBooks,
	updateShelf,
} from "./shelf.service";

export const shelfRouter = {
	listByUsername: publicProcedure
		.input(ListShelvesByUsernameInputSchema)
		.output(ListShelvesByUsernameOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesByUsername(
				input.username,
				input.status,
				context.session?.user?.id,
				context.db,
			),
		),
	getBySlug: publicProcedure
		.input(GetShelfBySlugInputSchema)
		.output(GetShelfBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getShelfBySlug(
				input.username,
				input.shelfSlug,
				context.session?.user?.id,
				context.db,
			),
		),
	create: notBannedProcedure
		.input(CreateShelfInputSchema)
		.output(CreateShelfOutputSchema)
		.handler(async ({ input, context }) =>
			createShelf(input, context.session.user.id, context.db),
		),
	update: notBannedProcedure
		.input(UpdateShelfInputSchema)
		.output(UpdateShelfOutputSchema)
		.handler(async ({ input, context }) =>
			updateShelf(input, context.session.user.id, context.db),
		),
	delete: notBannedProcedure
		.input(DeleteShelfInputSchema)
		.output(DeleteShelfOutputSchema)
		.handler(async ({ input, context }) =>
			deleteShelf(input, context.session.user.id, context.db),
		),
	addBook: notBannedProcedure
		.input(AddBookToShelfInputSchema)
		.output(AddBookToShelfOutputSchema)
		.handler(async ({ input, context }) =>
			addBookToShelf(
				input.shelfSlug,
				input.bookSlug,
				context.session.user.id,
				context.db,
			),
		),
	removeBook: notBannedProcedure
		.input(RemoveBookFromShelfInputSchema)
		.output(RemoveBookFromShelfOutputSchema)
		.handler(async ({ input, context }) =>
			removeBookFromShelf(
				input.shelfSlug,
				input.bookSlug,
				context.session.user.id,
				context.db,
			),
		),
	reorderBooks: notBannedProcedure
		.input(ReorderShelfBooksInputSchema)
		.output(ReorderShelfBooksOutputSchema)
		.handler(async ({ input, context }) =>
			reorderShelfBooks(
				input.shelfSlug,
				input.bookSlugs,
				context.session.user.id,
				context.db,
			),
		),
	listForBook: protectedProcedure
		.input(ListShelvesForBookInputSchema)
		.output(ListShelvesForBookOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesForBook(input.bookSlug, context.session.user.id, context.db),
		),
	listMineEditable: protectedProcedure
		.input(ListShelvesForBookInputSchema.partial())
		.output(ListMyEditableShelvesOutputSchema)
		.handler(async ({ input, context }) =>
			listMyEditableShelves(
				input.bookSlug,
				context.session.user.id,
				context.db,
			),
		),
};
