import type { Prisma } from "@bbrc/db";
import { UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";
import {
	sittingListFiltersSchema,
	sittingListRanging,
	sittingSortableFields,
} from "../sitting/sitting.listing";

export const adminSittingSortableFields = [
	...sittingSortableFields,
	"readingStartedAt",
	"midtermAt",
	"postAttachments._count",
	"pollVotes",
] as const;

export const adminSittingListSorting = defineSorting<
	typeof adminSittingSortableFields,
	Prisma.SittingOrderByWithRelationInput
>(adminSittingSortableFields, "createdAt", "desc", {
	orderBy: {
		"participants._count": (direction) => ({
			participants: { _count: direction },
		}),
		"postAttachments._count": (direction) => ({
			postAttachments: { _count: direction },
		}),
	},
});

export { sittingListRanging as adminSittingListRanging };

export const adminSittingSearchableFields = [
	"slug",
	"selectedBookTitle",
] as const;

export const adminSittingListSearching = defineSearching<
	typeof adminSittingSearchableFields,
	Prisma.SittingWhereInput
>(adminSittingSearchableFields, {
	where: {
		selectedBookTitle: (query) => ({
			selectedBook: {
				title: { contains: query, mode: "insensitive" },
			},
		}),
	},
});

export const adminSittingListFiltersSchema = sittingListFiltersSchema
	.extend({
		hasSelectedBook: z.boolean(),
		deadlineOverdue: z.boolean(),
		hasMidtermScheduled: z.boolean(),
		minParticipants: z.number().int().min(0),
		minActiveParticipants: z.number().int().min(0),
		minPollVotes: z.number().int().min(0),
		minPollOptions: z.number().int().min(0),
		minCompletedParticipants: z.number().int().min(0),
		minDnfParticipants: z.number().int().min(0),
		minPostAttachments: z.number().int().min(0),
		participantUsernames: z.array(UserSchema.shape.username),
		minSelectedBookPages: z.number().int().min(1),
		maxSelectedBookPages: z.number().int().min(1),
	})
	.partial();

export type AdminSittingListFilters = z.infer<
	typeof adminSittingListFiltersSchema
>;
