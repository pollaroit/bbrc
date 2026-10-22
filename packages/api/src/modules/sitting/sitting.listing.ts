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

/** Sorts offered on the public list; `completedCount` is sorted in memory. */
export const sittingListSortableFields = [
	...sittingSortableFields,
	"completedCount",
] as const;

export const sittingListSorting = defineSorting<
	typeof sittingListSortableFields,
	Prisma.SittingOrderByWithRelationInput
>(sittingListSortableFields, "createdAt", "desc", {
	orderBy: {
		"participants._count": (direction) => ({
			participants: { _count: direction },
		}),
		// Counting completed members needs a grouped query, so the service sorts
		// these in memory; this is only a stable fallback.
		completedCount: (direction) => ({ createdAt: direction }),
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

export const sittingSearchableFields = ["slug", "book"] as const;

/** Matches the sitting name (spaces match underscores and dashes) or its chosen book's title. */
export const sittingListSearching = defineSearching<
	typeof sittingSearchableFields,
	Prisma.SittingWhereInput
>(sittingSearchableFields, {
	where: {
		slug: (query) => ({
			OR: [
				query.trim(),
				query.trim().replace(/\s+/g, "_"),
				query.trim().replace(/\s+/g, "-"),
			].map((variant) => ({
				slug: { contains: variant, mode: "insensitive" as const },
			})),
		}),
		book: (query) => ({
			selectedBook: { title: { contains: query, mode: "insensitive" } },
		}),
	},
});

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

/** Extra filters offered on the public sittings list. */
export const publicSittingListFiltersSchema = sittingListFiltersSchema
	.extend({
		minParticipants: z.number().int().min(1),
		maxParticipants: z.number().int().min(1),
		minCompleted: z.number().int().min(0),
		maxCompleted: z.number().int().min(0),
		minPages: z.number().int().min(1),
		maxPages: z.number().int().min(1),
		/** Only sittings the signed-in viewer takes part in. */
		mineOnly: z.boolean(),
	})
	.partial();

export function sittingOngoingWhere(): Prisma.SittingWhereInput {
	return {
		status: { in: [...sittingOngoingStatuses] },
	};
}
