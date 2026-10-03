import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";
import {
	shelfListFiltersSchema,
	shelfListRanging,
	shelfListSearching,
	shelfListSorting,
} from "./shelf.listing";

export const ShelfStatusSchema = zod.enum(["draft", "active", "archived"]);
export const ShelfTypeSchema = zod.enum(["ordered", "unordered"]);

export const ShelfBookOnShelfSchema = zod.object({
	position: zod.number().int().min(0),
	book: BookSchema.pick({
		slug: true,
		title: true,
		authors: true,
		coverId: true,
	}),
});

export const ShelfListItemSchema = zod.object({
	id: zod.uuid(),
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	coverImageUrl: zod.string().max(2048).nullable(),
	status: ShelfStatusSchema,
	type: ShelfTypeSchema,
	bookCount: zod.number().int().min(0),
	updatedAt: zod.coerce.date(),
	/** First up to 4 book covers by shelf order; not stored on Shelf. */
	coverPreviewCoverIds: zod.array(zod.number().nullable()).max(4),
});

export const PublicShelfListItemSchema = ShelfListItemSchema.extend({
	owner: zod.object({
		username: UserSchema.shape.username,
		name: UserSchema.shape.name,
	}),
});

export const GetShelfListInputSchema = shelfListFiltersSchema
	.extend(CursorPaginationInputSchema.shape)
	.extend(shelfListSorting.inputSchema.shape)
	.extend(shelfListRanging.inputSchema.shape)
	.extend(shelfListSearching.inputSchema.shape)
	.superRefine((value, ctx) => {
		refineRangingBounds(
			{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
			ctx,
		);
	});

export const GetShelfListOutputSchema = CursorPaginationOutputSchema(
	PublicShelfListItemSchema,
);

export type GetShelfListInput = z.infer<typeof GetShelfListInputSchema>;
export type GetShelfListOutput = z.infer<typeof GetShelfListOutputSchema>;

export {
	shelfListFiltersSchema,
	shelfListRanging,
	shelfListSearching,
	shelfListSorting,
	shelfRangeableFields,
	shelfSearchableFields,
	shelfSortableFields,
	shelfTypeFilterLabels,
} from "./shelf.listing";

export const ShelfDetailSchema = ShelfListItemSchema.extend({
	books: zod.array(ShelfBookOnShelfSchema),
	isOwner: zod.boolean(),
});

export const ListShelvesByUsernameInputSchema = zod.object({
	username: UserSchema.shape.username,
	status: ShelfStatusSchema.optional(),
});

export const ListShelvesByUsernameOutputSchema = zod.object({
	items: zod.array(ShelfListItemSchema),
	isOwner: zod.boolean(),
});

export type ListShelvesByUsernameOutput = z.infer<
	typeof ListShelvesByUsernameOutputSchema
>;

export const GetShelfBySlugInputSchema = zod.object({
	username: UserSchema.shape.username,
	shelfSlug: zod.string().min(3).max(60),
});

export const GetShelfBySlugOutputSchema = ShelfDetailSchema;

export type GetShelfBySlugOutput = z.infer<typeof GetShelfBySlugOutputSchema>;

export const CreateShelfInputSchema = zod.object({
	title: zod.string().min(1).max(120),
	description: zod.string().max(2000).nullish(),
	status: ShelfStatusSchema.optional(),
	type: ShelfTypeSchema.optional(),
	/** When set, add this catalog book after create (e.g. from book detail). */
	addBookSlug: BookSchema.shape.slug.optional(),
});

export const CreateShelfOutputSchema = zod.object({
	slug: zod.string(),
});

export type CreateShelfInput = z.infer<typeof CreateShelfInputSchema>;
export type CreateShelfOutput = z.infer<typeof CreateShelfOutputSchema>;

export const UpdateShelfInputSchema = zod.object({
	shelfSlug: zod.string().min(3).max(60),
	title: zod.string().min(1).max(120).optional(),
	description: zod.string().max(2000).nullish(),
	status: ShelfStatusSchema.optional(),
	type: ShelfTypeSchema.optional(),
});

export const UpdateShelfOutputSchema = ShelfListItemSchema;

export type UpdateShelfInput = z.infer<typeof UpdateShelfInputSchema>;

export const DeleteShelfInputSchema = zod.object({
	shelfSlug: zod.string().min(3).max(60),
	/** Required when the shelf has books. Must match shelf title exactly. */
	confirmTitle: zod.string().optional(),
});

export const DeleteShelfOutputSchema = zod.object({
	removed: zod.literal(true),
});

export type DeleteShelfInput = z.infer<typeof DeleteShelfInputSchema>;

export const AddBookToShelfInputSchema = zod.object({
	shelfSlug: zod.string().min(3).max(60),
	bookSlug: BookSchema.shape.slug,
});

export const AddBookToShelfOutputSchema = zod.object({
	added: zod.literal(true),
	bookCount: zod.number().int().min(1).max(MAX_BOOKS_PER_SHELF),
});

export const RemoveBookFromShelfInputSchema = zod.object({
	shelfSlug: zod.string().min(3).max(60),
	bookSlug: BookSchema.shape.slug,
});

export const RemoveBookFromShelfOutputSchema = zod.object({
	removed: zod.literal(true),
});

export const ReorderShelfBooksInputSchema = zod.object({
	shelfSlug: zod.string().min(3).max(60),
	bookSlugs: zod.array(BookSchema.shape.slug).min(1).max(MAX_BOOKS_PER_SHELF),
});

export const ReorderShelfBooksOutputSchema = zod.object({
	updated: zod.literal(true),
});

export const ListShelvesForBookInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
});

export const ShelfChipSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	status: ShelfStatusSchema,
	ownerUsername: zod.string(),
	isOwner: zod.boolean(),
});

export const ListShelvesForBookOutputSchema = zod.object({
	items: zod.array(ShelfChipSchema),
	maxBooksPerShelf: zod.literal(MAX_BOOKS_PER_SHELF),
});

export type ListShelvesForBookOutput = z.infer<
	typeof ListShelvesForBookOutputSchema
>;

export const ListMyEditableShelvesOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			slug: zod.string(),
			title: zod.string(),
			status: ShelfStatusSchema,
			bookCount: zod.number().int().min(0).max(MAX_BOOKS_PER_SHELF),
			containsBook: zod.boolean(),
		}),
	),
	maxBooksPerShelf: zod.literal(MAX_BOOKS_PER_SHELF),
});

export type ListMyEditableShelvesOutput = z.infer<
	typeof ListMyEditableShelvesOutputSchema
>;

export const shelfListItemSelect = {
	id: true,
	slug: true,
	title: true,
	description: true,
	coverImageUrl: true,
	status: true,
	type: true,
	updatedAt: true,
	_count: { select: { books: true } },
} as const;

export const shelfCoverPreviewSelect = {
	orderBy: { position: "asc" as const },
	take: 4,
	select: { book: { select: { coverId: true } } },
} as const;

export const shelfListItemWithCoverSelect = {
	...shelfListItemSelect,
	books: shelfCoverPreviewSelect,
} as const;

export const shelfBookSelect = {
	position: true,
	book: {
		select: {
			slug: true,
			title: true,
			authors: true,
			coverId: true,
		},
	},
} as const;

function mapCoverPreviewCoverIds(
	books: { book: { coverId: number | null } }[] | undefined,
): (number | null)[] {
	if (!books?.length) {
		return [];
	}
	return books.map((row) => row.book.coverId);
}

export function mapShelfListItem(
	row: {
		id: string;
		slug: string;
		title: string;
		description: string | null;
		coverImageUrl: string | null;
		status: z.infer<typeof ShelfStatusSchema>;
		type: z.infer<typeof ShelfTypeSchema>;
		updatedAt: Date;
		_count: { books: number };
		books?: { book: { coverId: number | null } }[];
	},
	coverPreviewCoverIds?: (number | null)[],
): z.infer<typeof ShelfListItemSchema> {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description,
		coverImageUrl: row.coverImageUrl,
		status: row.status,
		type: row.type,
		bookCount: row._count.books,
		updatedAt: row.updatedAt,
		coverPreviewCoverIds:
			coverPreviewCoverIds ?? mapCoverPreviewCoverIds(row.books),
	};
}

export const getShelfListFields = {
	...shelfListItemSelect,
	user: {
		select: {
			username: true,
			name: true,
		},
	},
} as const;
