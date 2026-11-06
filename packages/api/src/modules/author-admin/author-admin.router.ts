import { minRoleProcedure, superAdminProcedure } from "../../procedures";
import {
	revalidateBookIsr,
	revalidateBooksCatalogIsr,
} from "../../revalidate-isr";
import { audited } from "../audit/audit-middleware";
import { authorBefore, authorTarget } from "../audit/audit-targets";
import {
	authorSlugsByIds,
	revalidateAuthorSlugs,
	revalidateAuthorsByIds,
} from "../author/author-isr";
import {
	AddAuthorAliasInputSchema,
	AuthorIdInputSchema,
	CreateAuthorInputSchema,
	FixNationalitiesInputSchema,
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
import {
	AdminAuthorListInputSchema,
	AdminAuthorListOutputSchema,
	AdminAuthorOverviewOutputSchema,
	AdminAuthorScopeInputSchema,
	AdminAuthorStatsOutputSchema,
} from "./author-dashboard.schema";
import {
	getAdminAuthorOverview,
	getAdminAuthorStats,
	listAdminAuthors,
} from "./author-dashboard.service";
import { fixAuthorNationalities } from "./author-nationalities.service";

export const authorAdminRouter = {
	/** Re-derives nationalities as modern countries for authors with none or an old code. Resumable. */
	fixNationalities: superAdminProcedure
		.input(FixNationalitiesInputSchema)
		.use(
			audited("author.nationalities_fixed", {
				target: () => ({ type: "system", label: "Author nationalities" }),
				metadata: ({ output }) => ({ changed: output.changed }),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await fixAuthorNationalities(input, context.db);
			if (!result.dryRun && result.changed > 0) {
				revalidateAuthorsByIds(
					context,
					result.samples.map((sample) => sample.id),
				);
			}
			return result;
		}),

	/** Dashboard like /admin/books: counts, charts and rankings for the filtered authors. */
	overview: superAdminProcedure
		.input(AdminAuthorScopeInputSchema)
		.output(AdminAuthorOverviewOutputSchema)
		.handler(({ input, context }) => getAdminAuthorOverview(input, context.db)),

	/** The full directory table with filters, sorting, search and paging (like /admin/books/list). */
	list: superAdminProcedure
		.input(AdminAuthorListInputSchema)
		.output(AdminAuthorListOutputSchema)
		.handler(({ input, context }) => listAdminAuthors(input, context.db)),

	/** Deeper breakdowns and time series (like /admin/books/stats). */
	stats: superAdminProcedure
		.input(AdminAuthorScopeInputSchema)
		.output(AdminAuthorStatsOutputSchema)
		.handler(({ input, context }) => getAdminAuthorStats(input, context.db)),

	/** Chips in the add / edit book form: our authors first, then Open Library suggestions. */
	search: minRoleProcedure("admin")
		.input(SearchAuthorsInputSchema)
		.handler(({ input, context }) =>
			searchAuthorsForChips(input.query, context.db),
		),

	/** By name (optionally an Open Library id). Returns the existing author when there is one. */
	create: minRoleProcedure("admin")
		.input(CreateAuthorInputSchema)
		.use(
			audited("author.created", {
				target: ({ output }) => ({
					type: "author",
					id: output.author.id,
					label: output.author.name,
				}),
			}),
		)
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

	getForEdit: superAdminProcedure
		.input(GetAuthorForEditInputSchema)
		.handler(({ input, context }) => getAuthorForEdit(input.slug, context.db)),

	update: superAdminProcedure
		.input(UpdateAuthorInputSchema)
		.use(
			audited("author.updated", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
				metadata: ({ input }) => ({
					fields: Object.entries(input)
						.filter(([key, value]) => key !== "id" && value !== undefined)
						.map(([key]) => key),
				}),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await updateAuthor(input, context.db);
			revalidateAuthorSlugs(context, [result.slug]);
			if (result.changed) {
				// A rename rewrites the names copy on the author's books.
				revalidateBooksCatalogIsr(context);
			}
			return result;
		}),

	setLock: superAdminProcedure
		.input(SetAuthorLockInputSchema)
		.use(
			audited("author.lock_changed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
				metadata: ({ input }) => ({ field: input.field, locked: input.locked }),
			}),
		)
		.handler(({ input, context }) => setAuthorFieldLock(input, context.db)),

	aliases: {
		add: superAdminProcedure
			.input(AddAuthorAliasInputSchema)
			.use(
				audited("author.alias_added", {
					before: ({ input, db }) => authorBefore(db, input.id),
					target: ({ before, input }) => authorTarget(before, input.id),
					metadata: ({ input }) => ({ alias: input.alias }),
				}),
			)
			.handler(async ({ input, context }) => {
				const result = await addAuthorAlias(input, context.db);
				await revalidateAuthorsByIds(context, [input.id]);
				return result;
			}),
		remove: superAdminProcedure
			.input(RemoveAuthorAliasInputSchema)
			.use(
				audited("author.alias_removed", {
					before: async ({ input, db }) => ({
						author: await authorBefore(db, input.id),
						alias: await db.authorAlias.findUnique({
							where: { id: input.aliasId },
							select: { alias: true },
						}),
					}),
					target: ({ before, input }) => authorTarget(before?.author, input.id),
					metadata: ({ before }) => ({ alias: before?.alias?.alias }),
				}),
			)
			.handler(async ({ input, context }) => {
				const result = await removeAuthorAlias(input, context.db);
				await revalidateAuthorsByIds(context, [input.id]);
				return result;
			}),
	},

	confirm: superAdminProcedure
		.input(AuthorIdInputSchema)
		.use(
			audited("author.confirmed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await confirmAuthor(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	refresh: superAdminProcedure
		.input(RefreshAuthorInputSchema)
		.use(
			audited("author.refreshed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await refreshAuthor(input, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	merge: superAdminProcedure
		.input(MergeAuthorsInputSchema)
		.use(
			audited("author.merged", {
				before: async ({ input, db }) => ({
					from: await authorBefore(db, input.fromId),
					into: await authorBefore(db, input.intoId),
				}),
				// The kept author is the target; the one folded in is named in the details.
				target: ({ before, input }) => authorTarget(before?.into, input.intoId),
				metadata: ({ before, input }) => ({
					mergedName: before?.from?.name,
					mergedId: input.fromId,
				}),
			}),
		)
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

	delete: superAdminProcedure
		.input(AuthorIdInputSchema)
		.use(
			audited("author.deleted", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
			}),
		)
		.handler(async ({ input, context }) => {
			const slugs = await authorSlugsByIds(context.db, [input.id]);
			const result = await deleteAuthorByAdmin(input.id, context.db);
			revalidateAuthorSlugs(context, slugs);
			return result;
		}),

	suggestPhoto: superAdminProcedure
		.input(AuthorIdInputSchema)
		.handler(({ input, context }) => suggestPhoto(input.id, context.db)),

	applyPhoto: superAdminProcedure
		.input(AuthorIdInputSchema)
		.use(
			audited("author.photo_changed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
				metadata: () => ({ change: "applied" as const }),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await applySuggestedPhoto(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	uploadPhoto: superAdminProcedure
		.input(UploadAuthorPhotoInputSchema)
		.use(
			audited("author.photo_changed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
				metadata: () => ({ change: "uploaded" as const }),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await saveUploadedPhoto(input, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	removePhoto: superAdminProcedure
		.input(AuthorIdInputSchema)
		.use(
			audited("author.photo_changed", {
				before: ({ input, db }) => authorBefore(db, input.id),
				target: ({ before, input }) => authorTarget(before, input.id),
				metadata: () => ({ change: "removed" as const }),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await removeAuthorPhoto(input.id, context.db);
			await revalidateAuthorsByIds(context, [input.id]);
			return result;
		}),

	reviewQueue: superAdminProcedure
		.input(ReviewQueueInputSchema)
		.handler(({ input, context }) => getReviewQueue(input.limit, context.db)),
};
