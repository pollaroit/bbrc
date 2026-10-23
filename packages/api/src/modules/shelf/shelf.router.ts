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
import { viewerFromSession } from "../user/user-visibility";
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
	UpdateShelfInputSchema,
	UpdateShelfOutputSchema,
} from "./shelf.schema";
import {
	addBookToShelf,
	createShelf,
	deleteShelf,
	getShelfBySlug,
	getShelfList,
	listMyEditableShelves,
	listShelvesByUsername,
	listShelvesForBook,
	removeBookFromShelf,
	reorderShelfBooks,
	updateShelf,
} from "./shelf.service";

export const shelfRouter = {
	getList: publicProcedure
		.input(GetShelfListInputSchema)
		.output(GetShelfListOutputSchema)
		.handler(async ({ input, context }) => getShelfList(input, context.db)),
	listByUsername: publicProcedure
		.input(ListShelvesByUsernameInputSchema)
		.output(ListShelvesByUsernameOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesByUsername(
				input.username,
				input.status,
				viewerFromSession(context.session),
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
				viewerFromSession(context.session),
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
	update: notBannedProcedure
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
				context.session.user.username,
				result.slug,
			);
			return result;
		}),
	delete: notBannedProcedure
		.input(DeleteShelfInputSchema)
		.output(DeleteShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await deleteShelf(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(context, context.session.user.username);
			return result;
		}),
	addBook: notBannedProcedure
		.use(checkAchievementsAfter("shelves"))
		.input(AddBookToShelfInputSchema)
		.output(AddBookToShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await addBookToShelf(
				input.shelfSlug,
				input.bookSlug,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				context.session.user.username,
				input.shelfSlug,
			);
			revalidateBookIsr(context, input.bookSlug);
			return result;
		}),
	removeBook: notBannedProcedure
		.input(RemoveBookFromShelfInputSchema)
		.output(RemoveBookFromShelfOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeBookFromShelf(
				input.shelfSlug,
				input.bookSlug,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				context.session.user.username,
				input.shelfSlug,
			);
			revalidateBookIsr(context, input.bookSlug);
			return result;
		}),
	reorderBooks: notBannedProcedure
		.input(ReorderShelfBooksInputSchema)
		.output(ReorderShelfBooksOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await reorderShelfBooks(
				input.shelfSlug,
				input.bookSlugs,
				context.session.user.id,
				context.db,
			);
			revalidateUserShelvesIsr(
				context,
				context.session.user.username,
				input.shelfSlug,
			);
			return result;
		}),
	listForBook: publicProcedure
		.input(ListShelvesForBookInputSchema)
		.output(ListShelvesForBookOutputSchema)
		.handler(async ({ input, context }) =>
			listShelvesForBook(input.bookSlug, context.session?.user?.id, context.db),
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
