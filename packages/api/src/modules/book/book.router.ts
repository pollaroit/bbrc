import { BookSchema } from "@bbrc/schemas";
import { adminProcedure, publicProcedure } from "../../procedures";
import { revalidateBookIsr } from "../../revalidate-isr";
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
		.handler(async ({ input, context }) => {
			const book = await addBook(input, context.db);
			revalidateBookIsr(context, book.slug);
			return book;
		}),
	updateBook: adminProcedure
		.input(UpdateBookInputSchema)
		.output(UpdateBookOutputSchema)
		.handler(async ({ input, context }) => {
			const book = await updateBook(input, context.db);
			revalidateBookIsr(context, book.slug);
			return book;
		}),
	removeBook: adminProcedure
		.input(BookSchema.shape.slug)
		.output(BookSchema.shape.slug)
		.handler(async ({ input, context }) => {
			const slug = await removeBook(input, context.db);
			revalidateBookIsr(context, slug);
			return slug;
		}),
};
