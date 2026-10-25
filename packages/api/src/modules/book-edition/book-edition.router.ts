import {
	adminProcedure,
	notBannedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	BookEditionIdInputSchema,
	BookEditionItemSchema,
	CheckEditionIsbnInputSchema,
	CheckEditionIsbnOutputSchema,
	CreateBookEditionInputSchema,
	LinkBookEditionInputSchema,
	ListBookEditionsInputSchema,
	ListBookEditionsOutputSchema,
	MergeBookEditionsInputSchema,
	OkSchema,
	UpdateBookEditionInputSchema,
} from "./book-edition.schema";
import {
	checkEditionIsbn,
	createBookEdition,
	deleteBookEdition,
	linkBookEdition,
	listBookEditions,
	mergeBookEditions,
	setBookEditionVerified,
	updateBookEdition,
} from "./book-edition.service";

const actorOf = (session: {
	user: { id: string; isAdmin?: boolean | null };
}) => ({
	id: session.user.id,
	isAdmin: Boolean(session.user.isAdmin),
});

export const bookEditionRouter = {
	list: publicProcedure
		.input(ListBookEditionsInputSchema)
		.output(ListBookEditionsOutputSchema)
		.handler(({ input, context }) =>
			listBookEditions(
				context.db,
				context.session ? actorOf(context.session) : null,
				input.bookSlug,
			),
		),
	create: notBannedProcedure
		.input(CreateBookEditionInputSchema)
		.output(BookEditionItemSchema)
		.handler(({ input, context }) =>
			createBookEdition(context.db, actorOf(context.session), input),
		),
	update: notBannedProcedure
		.input(UpdateBookEditionInputSchema)
		.output(BookEditionItemSchema)
		.handler(({ input, context }) =>
			updateBookEdition(context.db, actorOf(context.session), input),
		),
	delete: notBannedProcedure
		.input(BookEditionIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await deleteBookEdition(context.db, actorOf(context.session), input.id);
			return { ok: true as const };
		}),
	verify: adminProcedure
		.input(BookEditionIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await setBookEditionVerified(
				context.db,
				actorOf(context.session),
				input.id,
				true,
			);
			return { ok: true as const };
		}),
	unverify: adminProcedure
		.input(BookEditionIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await setBookEditionVerified(
				context.db,
				actorOf(context.session),
				input.id,
				false,
			);
			return { ok: true as const };
		}),
	merge: adminProcedure
		.input(MergeBookEditionsInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await mergeBookEditions(context.db, input.fromId, input.intoId);
			return { ok: true as const };
		}),
	link: adminProcedure
		.input(LinkBookEditionInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await linkBookEdition(context.db, input.id, input.openLibraryOlid);
			return { ok: true as const };
		}),
	checkIsbn: notBannedProcedure
		.input(CheckEditionIsbnInputSchema)
		.output(CheckEditionIsbnOutputSchema)
		.handler(({ input, context }) =>
			checkEditionIsbn(context.db, input.bookSlug, input.isbn),
		),
};
