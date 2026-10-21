import type { Prisma } from "@bbrc/db";
import { ProgressSchema, SittingStatusSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const userParticipationSortableFields = [
	"updatedAt",
	"startedAt",
	"deadline",
	"status",
	"participants",
] as const;

export type UserParticipationSortableField =
	(typeof userParticipationSortableFields)[number];

/** Sorts on the member's participation row or its sitting. */
export const userParticipationListSorting = defineSorting<
	typeof userParticipationSortableFields,
	Prisma.ParticipationOrderByWithRelationInput
>(userParticipationSortableFields, "updatedAt", "desc", {
	orderBy: {
		startedAt: (direction) => ({ sitting: { createdAt: direction } }),
		deadline: (direction) => ({ sitting: { deadline: direction } }),
		status: (direction) => ({ sitting: { status: direction } }),
		participants: (direction) => ({
			sitting: { participants: { _count: direction } },
		}),
	},
});

export const userParticipationRangeableFields = [
	"startedAt",
	"deadline",
] as const;

export const userParticipationListRanging = defineRanging<
	typeof userParticipationRangeableFields,
	Prisma.ParticipationWhereInput
>(userParticipationRangeableFields, "startedAt", {
	where: {
		startedAt: ({ from, to }) => ({
			sitting: { createdAt: { gte: from, lte: to } },
		}),
		deadline: ({ from, to }) => ({
			sitting: { deadline: { gte: from, lte: to } },
		}),
	},
});

export const userParticipationSearchableFields = ["slug", "book"] as const;

/** Matches the sitting name/slug (spaces match underscores and dashes) or the chosen book's title. */
export const userParticipationListSearching = defineSearching<
	typeof userParticipationSearchableFields,
	Prisma.ParticipationWhereInput
>(userParticipationSearchableFields, {
	where: {
		slug: (query) => ({
			OR: [
				query.trim(),
				query.trim().replace(/\s+/g, "_"),
				query.trim().replace(/\s+/g, "-"),
			].map((variant) => ({
				sitting: { slug: { contains: variant, mode: "insensitive" as const } },
			})),
		}),
		book: (query) => ({
			sitting: {
				selectedBook: { title: { contains: query, mode: "insensitive" } },
			},
		}),
	},
});

export const userParticipationFiltersSchema = z
	.object({
		/** Sitting status. */
		statuses: z.array(SittingStatusSchema),
		/** The member's own reading progress. */
		progresses: z.array(ProgressSchema),
		minParticipants: z.number().int().min(1),
		maxParticipants: z.number().int().min(1),
		/** Only sittings the signed-in viewer also took part in. */
		mutualOnly: z.boolean(),
	})
	.partial();
