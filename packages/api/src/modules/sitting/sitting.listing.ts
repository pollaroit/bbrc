import type { Prisma } from "@bbrc/db";
import { SittingStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

/** Statuses that count as an active sitting (only one may exist at a time). */
export const sittingOngoingStatuses = [
	"voting",
	"reading",
] as const satisfies readonly z.infer<typeof SittingStatusSchema>[];

export const sittingSortableFields = [
	"createdAt",
	"updatedAt",
	"deadline",
	"status",
	"participants._count",
] as const;

export const sittingListSorting = defineSorting<
	typeof sittingSortableFields,
	Prisma.SittingOrderByWithRelationInput
>(sittingSortableFields, "createdAt", "desc", {
	orderBy: {
		"participants._count": (direction) => ({
			participants: { _count: direction },
		}),
	},
});

export const sittingRangeableFields = [
	"createdAt",
	"updatedAt",
	"deadline",
] as const;

export const sittingListRanging = defineRanging<
	typeof sittingRangeableFields,
	Prisma.SittingWhereInput
>(sittingRangeableFields, "createdAt");

export const sittingSearchableFields = ["slug"] as const;

export const sittingListSearching = defineSearching<
	typeof sittingSearchableFields,
	Prisma.SittingWhereInput
>(sittingSearchableFields);

export const sittingStatusFilterLabels = {
	voting: "Voting",
	reading: "Reading",
	finished: "Finished",
} as const satisfies Record<z.infer<typeof SittingStatusSchema>, string>;

export const sittingListFiltersSchema = z
	.object({
		statuses: z.array(SittingStatusSchema),
		/** When true, only `voting` and `reading` sittings are returned. */
		ongoingOnly: z.boolean(),
	})
	.partial();

export function sittingOngoingWhere(): Prisma.SittingWhereInput {
	return {
		status: { in: [...sittingOngoingStatuses] },
	};
}
