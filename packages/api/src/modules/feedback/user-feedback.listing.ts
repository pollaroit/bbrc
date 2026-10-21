import type { Prisma } from "@bbrc/db";
import { normalizeContentForStorage } from "@bbrc/shared";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const userFeedbackSortableFields = [
	"createdAt",
	"rating",
	"likes",
	"comments",
	"book",
] as const;

export const userFeedbackListSorting = defineSorting<
	typeof userFeedbackSortableFields,
	Prisma.FeedbackOrderByWithRelationInput
>(userFeedbackSortableFields, "createdAt", "desc", {
	orderBy: {
		likes: (direction) => ({ likes: { _count: direction } }),
		comments: (direction) => ({ comments: { _count: direction } }),
		book: (direction) => ({ book: { title: direction } }),
	},
});

export const userFeedbackRangeableFields = ["createdAt"] as const;

export const userFeedbackListRanging = defineRanging<
	typeof userFeedbackRangeableFields,
	Prisma.FeedbackWhereInput
>(userFeedbackRangeableFields, "createdAt");

export const userFeedbackSearchableFields = ["book", "review"] as const;

/** Reviews are stored as rich-content JSON; matching its text is approximate. */
export const userFeedbackListSearching = defineSearching<
	typeof userFeedbackSearchableFields,
	Prisma.FeedbackWhereInput
>(userFeedbackSearchableFields, {
	where: {
		book: (query) => ({
			book: { title: { contains: query, mode: "insensitive" } },
		}),
		review: (query) => ({
			review: { contains: query, mode: "insensitive" },
		}),
	},
});

export const userFeedbackFiltersSchema = z
	.object({
		minRating: z.number().min(0).max(5),
		maxRating: z.number().min(0).max(5),
		/** `written` has review text; `rating_only` is a rating with no text. */
		reviewType: z.enum(["written", "rating_only"]),
		/** `only` keeps spoiler-tagged reviews; `hide` drops them. */
		spoilers: z.enum(["only", "hide"]),
		/** Only books the signed-in viewer also reviewed. */
		mutualOnly: z.boolean(),
	})
	.partial();

const EMPTY_REVIEW_STORED = normalizeContentForStorage("");

export function userFeedbackReviewTypeWhere(
	reviewType: "written" | "rating_only" | undefined,
): Prisma.FeedbackWhereInput {
	if (reviewType === "rating_only") {
		return { review: { in: ["", EMPTY_REVIEW_STORED] } };
	}
	if (reviewType === "written") {
		return { review: { notIn: ["", EMPTY_REVIEW_STORED] } };
	}
	return {};
}
