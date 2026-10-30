import type { Prisma } from "@bbrc/db";
import { UserStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const adminUserSortableFields = [
	"createdAt",
	"name",
	"username",
	"xp",
	"rp",
	"posts._count",
	"comments._count",
	"likes._count",
	"feedbacks._count",
	"participations._count",
	"favorites._count",
	"shelves._count",
	"documents._count",
	"bookRequests._count",
	"factImpressions._count",
	"reads._count",
] as const;

export const adminUserListSorting = defineSorting<
	typeof adminUserSortableFields,
	Prisma.UserOrderByWithRelationInput
>(adminUserSortableFields, "createdAt", "desc", {
	orderBy: {
		"posts._count": (d) => ({ posts: { _count: d } }),
		"comments._count": (d) => ({ comments: { _count: d } }),
		"likes._count": (d) => ({ likes: { _count: d } }),
		"feedbacks._count": (d) => ({ feedbacks: { _count: d } }),
		"participations._count": (d) => ({ participations: { _count: d } }),
		"favorites._count": (d) => ({ favorites: { _count: d } }),
		"shelves._count": (d) => ({ shelves: { _count: d } }),
		"documents._count": (d) => ({ documents: { _count: d } }),
		"bookRequests._count": (d) => ({ bookRequests: { _count: d } }),
		"factImpressions._count": (d) => ({ factImpressions: { _count: d } }),
		"reads._count": (d) => ({ reads: { _count: d } }),
	},
});

export const adminUserRangeableFields = ["createdAt"] as const;

export const adminUserListRanging = defineRanging<
	typeof adminUserRangeableFields,
	Prisma.UserWhereInput
>(adminUserRangeableFields, "createdAt");

export const adminUserSearchableFields = ["name", "username", "email"] as const;

export const adminUserListSearching = defineSearching<
	typeof adminUserSearchableFields,
	Prisma.UserWhereInput
>(adminUserSearchableFields);

export const adminUserListFiltersSchema = z
	.object({
		statuses: z.array(UserStatusSchema),
		isAdmin: z.boolean(),
		minXp: z.number().int().min(0),
		minRp: z.number().int().min(0),
		minPosts: z.number().int().min(0),
		minComments: z.number().int().min(0),
		minLikes: z.number().int().min(0),
		minFeedbacks: z.number().int().min(0),
		minParticipations: z.number().int().min(0),
		minFavorites: z.number().int().min(0),
		minShelves: z.number().int().min(0),
		minDocuments: z.number().int().min(0),
		minBookRequests: z.number().int().min(0),
		minFactImpressions: z.number().int().min(0),
		minReads: z.number().int().min(0),
		maxReads: z.number().int().min(0),
	})
	.partial();
