import { adminProcedure } from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
} from "../../revalidate-isr";
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
		.handler(({ input, context }) =>
			createAuthorByAdmin(input, context.db, context.session.user.id),
		),

	getForEdit: adminProcedure
		.input(GetAuthorForEditInputSchema)
		.handler(({ input, context }) => getAuthorForEdit(input.slug, context.db)),

	update: adminProcedure
		.input(UpdateAuthorInputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateAuthor(input, context.db);
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
			.handler(({ input, context }) => addAuthorAlias(input, context.db)),
		remove: adminProcedure
			.input(RemoveAuthorAliasInputSchema)
			.handler(({ input, context }) => removeAuthorAlias(input, context.db)),
	},

	confirm: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => confirmAuthor(input.id, context.db)),

	refresh: adminProcedure
		.input(RefreshAuthorInputSchema)
		.handler(({ input, context }) => refreshAuthor(input, context.db)),

	merge: adminProcedure
		.input(MergeAuthorsInputSchema)
		.handler(async ({ input, context }) => {
			const result = await mergeAuthorsByAdmin(input, context.db);
			for (const slug of result.bookSlugs) revalidateBookIsr(context, slug);
			revalidateBooksCatalogIsr(context);
			const { bookSlugs: _bookSlugs, ...rest } = result;
			return rest;
		}),

	delete: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => deleteAuthorByAdmin(input.id, context.db)),

	suggestPhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => suggestPhoto(input.id, context.db)),

	applyPhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => applySuggestedPhoto(input.id, context.db)),

	uploadPhoto: adminProcedure
		.input(UploadAuthorPhotoInputSchema)
		.handler(({ input, context }) => saveUploadedPhoto(input, context.db)),

	removePhoto: adminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => removeAuthorPhoto(input.id, context.db)),

	reviewQueue: adminProcedure
		.input(ReviewQueueInputSchema)
		.handler(({ input, context }) => getReviewQueue(input.limit, context.db)),
};
