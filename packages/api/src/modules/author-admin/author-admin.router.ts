import { adminProcedure } from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
} from "../../revalidate-isr";
import {
	authorSlugsByIds,
	revalidateAuthorSlugs,
	revalidateAuthorsByIds,
} from "../author/author-isr";
import {
	AddAuthorAliasInputSchema,
	AuthorIdInputSchema,
	CreateAuthorInputSchema,
	GetAuthorForEditInputSchema,
	MergeAuthorsInputSchema,
	RefreshAuthorInputSchema,
	RemoveAuthorAliasInputSchema,
	ReviewQueueInputSchema,
	SearchAuthorsInputSchema,
	SetAuthorLockInputSchema,
	UpdateAuthorInputSchema,
	UploadAuthorPhotoInputSchema,
} from "./author-admin.schema";
import {
	addAuthorAlias,
	applySuggestedPhoto,
	confirmAuthor,
	createAuthorByAdmin,
	deleteAuthorByAdmin,
	getAuthorForEdit,
	getReviewQueue,
	mergeAuthorsByAdmin,
	refreshAuthor,
	removeAuthorAlias,
	removeAuthorPhoto,
	saveUploadedPhoto,
	searchAuthorsForChips,
	setAuthorFieldLock,
	suggestPhoto,
	updateAuthor,
} from "./author-admin.service";

export const authorAdminRouter = {
	/** Chips in the add / edit book form: our authors first, then Open Library suggestions. */
	search: adminProcedure
		.input(SearchAuthorsInputSchema)
		.handler(({ input, context }) =>
			searchAuthorsForChips(input.query, context.db),
		),

	/** By name (optionally an Open Library id). Returns the existing author when there is one. */
	create: adminProcedure
		.input(CreateAuthorInputSchema)
		.handler(async ({ input, context }) => {
			const result = await createAuthorByAdmin(
				input,
				context.db,
				context.session.user.id,
			);
			if (result.created) {
				revalidateAuthorSlugs(context, [result.author.slug]);
			}
			return result;
		}),

	getForEdit: adminProcedure
		.input(GetAuthorForEditInputSchema)
		.handler(({ input, context }) => getAuthorForEdit(input.slug, context.db)),

	update: adminProcedure
		.input(UpdateAuthorInputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateAuthor(input, context.db);
			revalidateAuthorSlugs(context, [result.slug]);
			if (result.changed) {
				// A rename rewrites the names copy on the author's books.
				revalidateBooksCatalogIsr(context);
			}
			return result;
		}),

	setLock: adminProcedure
		.input(SetAuthorLockInputSchema)
		.handler(({ input, context }) => setAuthorFieldLock(input, context.db)),

	aliases: {
		add: adminProcedure
			.input(AddAuthorAliasInputSchema)
			.handler(async ({ input, context }) => {
				const result = await addAuthorAlias(input, context.db);
				await revalidateAuthorsByIds(context, [input.id]);
				return result;
			}),
		remove: adminProcedure
			.input(RemoveAuthorAliasInputSchema)
			.handler(async ({ input, context }) => {
				const result = await removeAuthorAlias(input, context.db);
				await revalidateAuthorsByIds(context, [input.id]);
				return result;
			}),
	},

	confirm: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(async ({ input, context }) => {
			const result = await confirmAuthor(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	refresh: adminProcedure
		.input(RefreshAuthorInputSchema)
		.handler(async ({ input, context }) => {
			const result = await refreshAuthor(input, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	merge: adminProcedure
		.input(MergeAuthorsInputSchema)
		.handler(async ({ input, context }) => {
			const before = await authorSlugsByIds(context.db, [
				input.fromId,
				input.intoId,
			]);
			const result = await mergeAuthorsByAdmin(input, context.db);
			revalidateAuthorSlugs(context, before);
			for (const slug of result.bookSlugs) revalidateBookIsr(context, slug);
			revalidateBooksCatalogIsr(context);
			const { bookSlugs: _bookSlugs, ...rest } = result;
			return rest;
		}),

	delete: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(async ({ input, context }) => {
			const slugs = await authorSlugsByIds(context.db, [input.id]);
			const result = await deleteAuthorByAdmin(input.id, context.db);
			revalidateAuthorSlugs(context, slugs);
			return result;
		}),

	suggestPhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => suggestPhoto(input.id, context.db)),

	applyPhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(async ({ input, context }) => {
			const result = await applySuggestedPhoto(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	uploadPhoto: adminProcedure
		.input(UploadAuthorPhotoInputSchema)
		.handler(async ({ input, context }) => {
			const result = await saveUploadedPhoto(input, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	removePhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(async ({ input, context }) => {
			const result = await removeAuthorPhoto(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	reviewQueue: adminProcedure
		.input(ReviewQueueInputSchema)
		.handler(({ input, context }) => getReviewQueue(input.limit, context.db)),
};
