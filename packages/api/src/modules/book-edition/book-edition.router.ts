import {
	minRoleProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import { audited } from "../audit/audit-middleware";
import { editionBefore, namedTarget } from "../audit/audit-targets";
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
	setBookPrimaryEdition,
	updateBookEdition,
} from "./book-edition.service";

const actorOf = (session: { user: { id: string; role?: string | null } }) => ({
	id: session.user.id,
	role: session.user.role,
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
	create: protectedProcedure
		.input(CreateBookEditionInputSchema)
		.output(BookEditionItemSchema)
		.handler(({ input, context }) =>
			createBookEdition(context.db, actorOf(context.session), input),
		),
	update: protectedProcedure
		.input(UpdateBookEditionInputSchema)
		.output(BookEditionItemSchema)
		.handler(({ input, context }) =>
			updateBookEdition(context.db, actorOf(context.session), input),
		),
	delete: protectedProcedure
		.input(BookEditionIdInputSchema)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await deleteBookEdition(context.db, actorOf(context.session), input.id);
			return { ok: true as const };
		}),
	verify: minRoleProcedure("admin")
		.input(BookEditionIdInputSchema)
		.use(
			audited("book.edition_verified", {
				before: ({ input, db }) => editionBefore(db, input.id),
				target: ({ before, input }) => namedTarget("edition", before, input.id),
			}),
		)
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
	unverify: minRoleProcedure("admin")
		.input(BookEditionIdInputSchema)
		.use(
			audited("book.edition_unverified", {
				before: ({ input, db }) => editionBefore(db, input.id),
				target: ({ before, input }) => namedTarget("edition", before, input.id),
			}),
		)
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
	merge: minRoleProcedure("admin")
		.input(MergeBookEditionsInputSchema)
		.use(
			audited("book.edition_merged", {
				before: ({ input, db }) => editionBefore(db, input.intoId),
				target: ({ before, input }) =>
					namedTarget("edition", before, input.intoId),
			}),
		)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await mergeBookEditions(context.db, input.fromId, input.intoId);
			return { ok: true as const };
		}),
	setPrimary: minRoleProcedure("admin")
		.input(BookEditionIdInputSchema)
		.use(
			audited("book.edition_primary_set", {
				before: ({ input, db }) => editionBefore(db, input.id),
				target: ({ before, input }) => namedTarget("edition", before, input.id),
			}),
		)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await setBookPrimaryEdition(context.db, input.id);
			return { ok: true as const };
		}),
	link: minRoleProcedure("admin")
		.input(LinkBookEditionInputSchema)
		.use(
			audited("book.edition_linked", {
				before: ({ input, db }) => editionBefore(db, input.id),
				target: ({ before, input }) => namedTarget("edition", before, input.id),
			}),
		)
		.output(OkSchema)
		.handler(async ({ input, context }) => {
			await linkBookEdition(context.db, input.id, input.openLibraryOlid);
			return { ok: true as const };
		}),
	checkIsbn: protectedProcedure
		.input(CheckEditionIsbnInputSchema)
		.output(CheckEditionIsbnOutputSchema)
		.handler(({ input, context }) =>
			checkEditionIsbn(context.db, input.bookSlug, input.isbn),
		),
};
