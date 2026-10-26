import type { Prisma } from "@bbrc/db";
import { UserSchema } from "@bbrc/schemas";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";

export const adminQuizStatuses = [
	"generating",
	"ready",
	"unavailable",
] as const;

export const adminQuizSortableFields = [
	"createdAt",
	"updatedAt",
	"book.title",
	"status",
	"submissions._count",
	"generatedBy.username",
] as const;

export const adminQuizListSorting = defineSorting<
	typeof adminQuizSortableFields,
	Prisma.QuizOrderByWithRelationInput
>(adminQuizSortableFields, "createdAt", "desc", {
	orderBy: {
		"book.title": (direction) => ({ book: { title: direction } }),
		"submissions._count": (direction) => ({
			submissions: { _count: direction },
		}),
		"generatedBy.username": (direction) => ({
			generatedBy: { username: direction },
		}),
	},
});

export const adminQuizRangeableFields = ["createdAt", "updatedAt"] as const;

export const adminQuizListRanging = defineRanging<
	typeof adminQuizRangeableFields,
	Prisma.QuizWhereInput
>(adminQuizRangeableFields, "createdAt");

export const adminQuizSearchableFields = [
	"book.title",
	"book.authors",
	"generatedBy.username",
	"generatedBy.name",
	"model",
] as const;

export const adminQuizListSearching = defineSearching<
	typeof adminQuizSearchableFields,
	Prisma.QuizWhereInput
>(adminQuizSearchableFields, {
	where: {
		"book.title": (query) => ({
			book: { title: { contains: query, mode: "insensitive" } },
		}),
		"book.authors": (query) => ({
			book: {
				OR: [
					{ authors: { has: query } },
					{
						authorLinks: {
							some: {
								author: { name: { contains: query, mode: "insensitive" } },
							},
						},
					},
				],
			},
		}),
		"generatedBy.username": (query) => ({
			generatedBy: { username: { contains: query, mode: "insensitive" } },
		}),
		"generatedBy.name": (query) => ({
			generatedBy: { name: { contains: query, mode: "insensitive" } },
		}),
	},
});

export const adminQuizListFiltersSchema = z
	.object({
		statuses: z.array(z.enum(adminQuizStatuses)),
		generatorUsernames: z.array(UserSchema.shape.username),
		/** Attempts that were submitted. */
		minAttempts: z.number().int().min(0),
		maxAttempts: z.number().int().min(0),
		minAverageScore: z.number().min(-10).max(20),
		maxAverageScore: z.number().min(-10).max(20),
		reportedOnly: z.boolean(),
		minReports: z.number().int().min(1),
		/** true = no attempts yet (can still be deleted); false = has attempts. */
		editable: z.boolean(),
	})
	.partial();

export type AdminQuizListFilters = z.infer<typeof adminQuizListFiltersSchema>;
