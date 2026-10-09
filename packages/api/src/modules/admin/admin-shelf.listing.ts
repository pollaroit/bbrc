import type { Prisma } from "@bbrc/db";
import { UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";
import {
	shelfListFiltersSchema,
	shelfListRanging,
	shelfSortableFields,
} from "../shelf/shelf.listing";
import { ShelfStatusSchema } from "../shelf/shelf.schema";

export const adminShelfSortableFields = [
	...shelfSortableFields,
	"postAttachments._count",
	"user.username",
] as const;

export const adminShelfListSorting = defineSorting<
	typeof adminShelfSortableFields,
	Prisma.ShelfOrderByWithRelationInput
>(adminShelfSortableFields, "updatedAt", "desc", {
	orderBy: {
		"books._count": (direction) => ({
			books: { _count: direction },
		}),
		"postAttachments._count": (direction) => ({
			postAttachments: { _count: direction },
		}),
		"user.username": (direction) => ({
			user: { username: direction },
		}),
	},
});

export { shelfListRanging as adminShelfListRanging };

export const adminShelfSearchableFields = [
	"title",
	"user.username",
	"user.name",
	"slug",
	"description",
] as const;

export const adminShelfListSearching = defineSearching<
	typeof adminShelfSearchableFields,
	Prisma.ShelfWhereInput
>(adminShelfSearchableFields, {
	where: {
		"user.username": (query) => ({
			user: { username: { contains: query, mode: "insensitive" } },
		}),
		"user.name": (query) => ({
			user: { name: { contains: query, mode: "insensitive" } },
		}),
		slug: (query) => ({
			slug: { contains: query, mode: "insensitive" },
		}),
		description: (query) => ({
			description: { contains: query, mode: "insensitive" },
		}),
	},
});

export const adminShelfListFiltersSchema = shelfListFiltersSchema
	.extend({
		statuses: z.array(ShelfStatusSchema),
		ownerUsernames: z.array(UserSchema.shape.username),
		hasCoverImage: z.boolean(),
		minPostAttachments: z.number().int().min(0),
	})
	.partial();

export type AdminShelfListFilters = z.infer<typeof adminShelfListFiltersSchema>;
