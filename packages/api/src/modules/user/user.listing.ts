import type { Prisma } from "@bbrc/db";
import { UserStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const userSortableFields = [
	"createdAt",
	"name",
	"xp",
	"rp",
	"participations._count",
	"feedbacks._count",
	"posts._count",
] as const;

export const userListSorting = defineSorting<
	typeof userSortableFields,
	Prisma.UserOrderByWithRelationInput
>(userSortableFields, "createdAt", "desc", {
	orderBy: {
		"feedbacks._count": (d) => ({ feedbacks: { _count: d } }),
		"participations._count": (d) => ({ participations: { _count: d } }),
		"posts._count": (d) => ({ posts: { _count: d } }),
	},
});

export const userRangeableFields = ["createdAt"] as const;

export const userListRanging = defineRanging<
	typeof userRangeableFields,
	Prisma.UserWhereInput
>(userRangeableFields, "createdAt");

export const userSearchableFields = ["name", "username"] as const;

export const userListSearching = defineSearching<
	typeof userSearchableFields,
	Prisma.UserWhereInput
>(userSearchableFields);

export const userListFiltersSchema = z
	.object({
		statuses: z.array(UserStatusSchema),
		isAdmin: z.boolean(),
	})
	.partial();
