import type { Prisma } from "@bbrc/db";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const shelfTypes = ["ordered", "unordered"] as const;

export const shelfSortableFields = [
	"createdAt",
	"updatedAt",
	"title",
	"books._count",
	"collaborators._count",
	"viewCount",
	"viewerCount",
] as const;

export const shelfListSorting = defineSorting<
	typeof shelfSortableFields,
	Prisma.ShelfOrderByWithRelationInput
>(shelfSortableFields, "updatedAt", "desc", {
	orderBy: {
		"books._count": (direction) => ({
			books: { _count: direction },
		}),
		"collaborators._count": (direction) => ({
			collaborators: { _count: direction },
		}),
	},
});

export const shelfRangeableFields = ["createdAt", "updatedAt"] as const;

export const shelfListRanging = defineRanging<
	typeof shelfRangeableFields,
	Prisma.ShelfWhereInput
>(shelfRangeableFields, "updatedAt");

export const shelfSearchableFields = [
	"title",
	"user.username",
	"user.name",
] as const;

export const shelfListSearching = defineSearching<
	typeof shelfSearchableFields,
	Prisma.ShelfWhereInput
>(shelfSearchableFields, {
	where: {
		"user.username": (query) => ({
			user: {
				username: {
					contains: query,
					mode: "insensitive",
				},
			},
		}),
		"user.name": (query) => ({
			user: {
				name: {
					contains: query,
					mode: "insensitive",
				},
			},
		}),
	},
});

export const shelfTypeFilterLabels = {
	ordered: "Ranked list",
	unordered: "Simple list",
} as const satisfies Record<(typeof shelfTypes)[number], string>;

export const shelfCollabFilters = ["shared", "solo"] as const;

export const shelfCollabFilterLabels = {
	shared: "Built together",
	solo: "Made by one person",
} as const satisfies Record<(typeof shelfCollabFilters)[number], string>;

export const shelfListFiltersSchema = z
	.object({
		types: z.array(z.enum(shelfTypes)),
		collab: z.enum(shelfCollabFilters),
		minBooks: z.number().int().min(1).max(500),
	})
	.partial();
