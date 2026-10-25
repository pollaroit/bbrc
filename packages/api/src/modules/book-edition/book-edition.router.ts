import {
	adminProcedure,
	notBannedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	BookEditionIdInputSchema,
	BookEditionItemSchema,
	CreateBookEditionInputSchema,
	ListBookEditionsInputSchema,
	ListBookEditionsOutputSchema,
	MergeBookEditionsInputSchema,
	OkSchema,
	UpdateBookEditionInputSchema,
} from "./book-edition.schema";
import {
	createBookEdition,
	deleteBookEdition,
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
};
