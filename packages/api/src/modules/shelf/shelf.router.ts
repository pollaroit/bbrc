import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	revalidateBookIsr,
	revalidateUserShelvesIsr,
} from "../../revalidate-isr";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import { loadViewer } from "../visibility/viewer";
import {
	AddBookToShelfInputSchema,
	AddBookToShelfOutputSchema,
	CreateShelfInputSchema,
	CreateShelfOutputSchema,
	DeleteShelfInputSchema,
	DeleteShelfOutputSchema,
	GetShelfBySlugInputSchema,
	GetShelfBySlugOutputSchema,
	GetShelfListInputSchema,
	GetShelfListOutputSchema,
	ListMyEditableShelvesOutputSchema,
	ListShelvesByUsernameInputSchema,
	ListShelvesByUsernameOutputSchema,
	ListShelvesForBookInputSchema,
	ListShelvesForBookOutputSchema,
	RemoveBookFromShelfInputSchema,
	RemoveBookFromShelfOutputSchema,
	ReorderShelfBooksInputSchema,
	ReorderShelfBooksOutputSchema,
	ShelfOverviewSchema,
	UpdateBookNotesInputSchema,
	UpdateBookNotesOutputSchema,
	UpdateShelfInputSchema,
	UpdateShelfOutputSchema,
} from "./shelf.schema";
import {
	addBookToShelf,
	createShelf,
	deleteShelf,
	getShelfBySlug,
	getShelfList,
	getShelfOverview,
	listMyEditableShelves,
	listShelvesByUsername,
	listShelvesForBook,
	removeBookFromShelf,
	reorderShelfBooks,
	updateBookNotes,
	updateShelf,
} from "./shelf.service";
import { shelfCollabRouter } from "./shelf-collab.router";

export const shelfRouter = {
	getList: publicProcedure
		.input(GetShelfListInputSchema)
		.output(GetShelfListOutputSchema)
		.handler(async ({ input, context }) =>
			getShelfList(
				input,
				await loadViewer(context.db, context.session),
				context.db,
			),
		),
	overview: publicProcedure
		.output(ShelfOverviewSchema)
		.handler(async ({ context }) =>
			getShelfOverview(
				await loadViewer(context.db, context.session),
				context.db,
			),
		),
	listByUsername: publicProcedure
		.input(ListShelvesByUsernameInputSchema)
		.output(ListShelvesByUsernameOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesByUsername(
				input.username,
				input.status,
				await loadViewer(context.db, context.session),
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
				await loadViewer(context.db, context.session),
				context.db,
			),
		),
	create: notBannedProcedure
		.use(checkAchievementsAfter("shelves"))
		.input(CreateShelfInputSchema)
		.output(CreateShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await createShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				context.session.user.username,
				result.slug,
			);
			if (input.addBookSlug) {
				revalidateBookIsr(context, input.addBookSlug);
			}
			return result;
		}),
	update: protectedProcedure
		.input(UpdateShelfInputSchema)
		.output(UpdateShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				result.slug,
			);
			return result;
		}),
	delete: protectedProcedure
		.input(DeleteShelfInputSchema)
		.output(DeleteShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await deleteShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
			);
			return result;
		}),
	addBook: protectedProcedure
		.use(checkAchievementsAfter("shelves"))
		.input(AddBookToShelfInputSchema)
		.output(AddBookToShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await addBookToShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			revalidateBookIsr(context, input.bookSlug);
			return result;
		}),
	removeBook: protectedProcedure
		.input(RemoveBookFromShelfInputSchema)
		.output(RemoveBookFromShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeBookFromShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			revalidateBookIsr(context, input.bookSlug);
			return result;
		}),
	reorderBooks: protectedProcedure
		.input(ReorderShelfBooksInputSchema)
		.output(ReorderShelfBooksOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await reorderShelfBooks(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			return result;
		}),
	updateBookNotes: protectedProcedure
		.input(UpdateBookNotesInputSchema)
		.output(UpdateBookNotesOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateBookNotes(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				input.ownerUsername ?? context.session.user.username,
				input.shelfSlug,
			);
			return result;
		}),
	collab: shelfCollabRouter,
	listForBook: publicProcedure
		.input(ListShelvesForBookInputSchema)
		.output(ListShelvesForBookOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesForBook(
				input.bookSlug,
				await loadViewer(context.db, context.session),
				context.db,
			),
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
