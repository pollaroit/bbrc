import { BookSchema } from "@bbrc/schemas";
import { adminProcedure, publicProcedure } from "../../procedures";
import {
	AddBookInputSchema,
	AddBookOutputSchema,
	GetBookBySlugOutputSchema,
	GetBookListInputSchema,
	GetBookListOutputSchema,
	UpdateBookInputSchema,
	UpdateBookOutputSchema,
} from "./book.schema";
import {
	addBook,
	getBookBySlug,
	getBookList,
	removeBook,
	updateBook,
} from "./book.service";

export const bookRouter = {
	getBookList: publicProcedure
		.input(GetBookListInputSchema)
		.output(GetBookListOutputSchema)
		.handler(
			async ({ input, context }) => await getBookList(input, context.db),
		),
	getBookBySlug: publicProcedure
		.input(BookSchema.shape.slug)
		.output(GetBookBySlugOutputSchema)
		.handler(
			async ({ input, context }) => await getBookBySlug(input, context.db),
		),
	addBook: adminProcedure
		.input(AddBookInputSchema)
		.output(AddBookOutputSchema)
		.handler(async ({ input, context }) => await addBook(input, context.db)),
	updateBook: adminProcedure
		.input(UpdateBookInputSchema)
		.output(UpdateBookOutputSchema)
		.handler(async ({ input, context }) => await updateBook(input, context.db)),
	removeBook: adminProcedure
		.input(BookSchema.shape.slug)
		.output(BookSchema.shape.slug)
		.handler(async ({ input, context }) => await removeBook(input, context.db)),
};
