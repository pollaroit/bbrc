import {
	BookSchema,
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
	UserSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import { MAX_BOOKS_PER_SHELF, SHELF_PERMISSIONS } from "@bbrc/shared";
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
/** Public: anyone can open it. Private: only the owner, collaborators and admins. */
/** What a shelf can be at (reads). Writing `friends` opens with per-item visibility; today only the wishlist can be set to it, from Privacy. */
export const ShelfVisibilitySchema = zod.enum(["public", "friends", "private"]);
/** What a shelf can be set to when created or edited. */
export const ShelfVisibilityInputSchema = zod.enum([
	"public",
	"friends",
	"private",
]);

export const ShelfPermissionSchema = zod.enum(SHELF_PERMISSIONS);

export const ShelfMemberRefSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: zod
		.string()
		.nullish()
		.transform((value) => value ?? null),
});

/** Optional owner of the shelf; omitted means the signed-in member's own shelf. */
const OwnerUsernameSchema = UserSchema.shape.username.optional();

export const ShelfBookOnShelfSchema = zod.object({
	position: zod.number().int().min(0),
	notes: zod.string().nullable(),
	addedAt: zod.coerce.date(),
	addedBy: ShelfMemberRefSchema.nullable(),
	updatedBy: ShelfMemberRefSchema.nullable(),
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
	visibility: ShelfVisibilitySchema,
	/** The member's special Wishlist shelf. */
	isWishlist: zod.boolean(),
	bookCount: zod.number().int().min(0),
	updatedAt: zod.coerce.date(),
	/** First up to 4 book covers by shelf order; not stored on Shelf. */
	coverPreviewCoverIds: zod.array(zod.number().nullable()).max(4),
});

export const PublicShelfListItemSchema = ShelfListItemSchema.extend({
	owner: ShelfMemberRefSchema,
	collaboratorCount: zod.number().int().min(0),
	/** The first few collaborators, oldest first. */
	collaborators: zod.array(ShelfMemberRefSchema),
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

export const ShelfViewerSchema = zod.object({
	role: zod.enum(["owner", "collaborator", "visitor"]),
	permissions: zod.array(ShelfPermissionSchema),
	/** Set when the viewer has an open invitation to this shelf. */
	pendingInvitationId: zod.string().nullable(),
});

export const ShelfDetailSchema = ShelfListItemSchema.extend({
	books: zod.array(ShelfBookOnShelfSchema),
	isOwner: zod.boolean(),
	owner: ShelfMemberRefSchema,
	collaborators: zod.array(ShelfMemberRefSchema),
	viewer: ShelfViewerSchema,
});

export const ListShelvesByUsernameInputSchema = zod.object({
	username: UserSchema.shape.username,
	status: ShelfStatusSchema.optional(),
});

export const MemberShelfListItemSchema = ShelfListItemSchema.extend({
	/** `owner` when the member made the shelf, `collaborator` when they help edit it. */
	role: zod.enum(["owner", "collaborator"]),
	owner: zod.object({
		username: UserSchema.shape.username,
		name: UserSchema.shape.name,
	}),
	collaboratorCount: zod.number().int().min(0),
});

export const ListShelvesByUsernameOutputSchema = zod.object({
	items: zod.array(MemberShelfListItemSchema),
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
	visibility: ShelfVisibilityInputSchema.optional(),
	/** When set, add this catalog book after create (e.g. from book detail). */
	addBookSlug: BookSchema.shape.slug.optional(),
});

export const CreateShelfOutputSchema = zod.object({
	slug: zod.string(),
});

export type CreateShelfInput = z.infer<typeof CreateShelfInputSchema>;
export type CreateShelfOutput = z.infer<typeof CreateShelfOutputSchema>;

export const UpdateShelfInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	title: zod.string().min(1).max(120).optional(),
	description: zod.string().max(2000).nullish(),
	status: ShelfStatusSchema.optional(),
	type: ShelfTypeSchema.optional(),
	/** Only the owner can change who can see the shelf. */
	visibility: ShelfVisibilityInputSchema.optional(),
});

export const UpdateShelfOutputSchema = ShelfListItemSchema;

export type UpdateShelfInput = z.infer<typeof UpdateShelfInputSchema>;

export const DeleteShelfInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	/** Required when the shelf has books. Must match shelf title exactly. */
	confirmTitle: zod.string().optional(),
});

export const DeleteShelfOutputSchema = zod.object({
	removed: zod.literal(true),
});

export type DeleteShelfInput = z.infer<typeof DeleteShelfInputSchema>;

export const AddBookToShelfInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	bookSlug: BookSchema.shape.slug,
});

export const AddBookToShelfOutputSchema = zod.object({
	added: zod.literal(true),
	bookCount: zod.number().int().min(1).max(MAX_BOOKS_PER_SHELF),
});

export const RemoveBookFromShelfInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	bookSlug: BookSchema.shape.slug,
});

export const RemoveBookFromShelfOutputSchema = zod.object({
	removed: zod.literal(true),
});

export const ReorderShelfBooksInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	bookSlugs: zod.array(BookSchema.shape.slug).min(1).max(MAX_BOOKS_PER_SHELF),
});

export const ReorderShelfBooksOutputSchema = zod.object({
	updated: zod.literal(true),
});

export const UpdateBookNotesInputSchema = zod.object({
	ownerUsername: OwnerUsernameSchema,
	shelfSlug: zod.string().min(3).max(60),
	bookSlug: BookSchema.shape.slug,
	notes: zod.string().max(500).nullable(),
});

export const UpdateBookNotesOutputSchema = zod.object({
	notes: zod.string().nullable(),
});

export const ListShelvesForBookInputSchema = zod.object({
	bookSlug: BookSchema.shape.slug,
});

export const ShelfForBookListItemSchema = ShelfListItemSchema.extend({
	owner: ShelfMemberRefSchema,
	isOwner: zod.boolean(),
	collaboratorCount: zod.number().int().min(0),
	collaborators: zod.array(ShelfMemberRefSchema),
});

export const ListShelvesForBookOutputSchema = zod.object({
	items: zod.array(ShelfForBookListItemSchema),
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
			/** Whose shelf it is; differs from the viewer for shelves they collaborate on. */
			ownerUsername: UserSchema.shape.username,
			isOwner: zod.boolean(),
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
	visibility: true,
	isWishlist: true,
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

const memberRefSelect = {
	select: { username: true, name: true, image: true },
} as const;

export const shelfBookSelect = {
	position: true,
	notes: true,
	createdAt: true,
	addedBy: memberRefSelect,
	updatedBy: memberRefSelect,
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
		visibility: z.infer<typeof ShelfVisibilitySchema>;
		isWishlist: boolean;
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
		visibility: row.visibility,
		isWishlist: row.isWishlist,
		bookCount: row._count.books,
		updatedAt: row.updatedAt,
		coverPreviewCoverIds:
			coverPreviewCoverIds ?? mapCoverPreviewCoverIds(row.books),
	};
}

export const shelfCardCollaboratorsSelect = {
	orderBy: { createdAt: "asc" as const },
	take: 4,
	select: {
		user: { select: { username: true, name: true, image: true } },
	},
} as const;

export const getShelfListFields = {
	...shelfListItemSelect,
	_count: { select: { books: true, collaborators: true } },
	collaborators: shelfCardCollaboratorsSelect,
	user: {
		select: {
			username: true,
			name: true,
			image: true,
		},
	},
} as const;

export const ShelfOverviewSchema = zod.object({
	shelves: zod.number().int().min(0),
	books: zod.number().int().min(0),
	sharedShelves: zod.number().int().min(0),
	collaborators: zod.number().int().min(0),
	newest: zod
		.object({
			title: zod.string(),
			slug: zod.string(),
			ownerUsername: UserSchema.shape.username,
		})
		.nullable(),
});

export type ShelfOverview = z.infer<typeof ShelfOverviewSchema>;
