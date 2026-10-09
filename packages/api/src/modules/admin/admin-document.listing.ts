import type { Prisma } from "@bbrc/db";
import { BookSchema, UserSchema } from "@bbrc/schemas";
import { DOCUMENT_LANGUAGE_CODES } from "@bbrc/shared";
import z from "zod";
import { defineRanging } from "../../utils/ranging";
import { defineSearching } from "../../utils/searching";
import { defineSorting } from "../../utils/sorting";
import { DocumentStatusSchema } from "../document/document.schema";

export const adminDocumentSortableFields = [
	"createdAt",
	"updatedAt",
	"name",
	"status",
	"language",
	"book.title",
	"user.username",
] as const;

export const adminDocumentListSorting = defineSorting<
	typeof adminDocumentSortableFields,
	Prisma.DocumentOrderByWithRelationInput
>(adminDocumentSortableFields, "createdAt", "desc", {
	orderBy: {
		"book.title": (direction) => ({
			book: { title: direction },
		}),
		"user.username": (direction) => ({
			user: { username: direction },
		}),
	},
});

export const adminDocumentRangeableFields = ["createdAt", "updatedAt"] as const;

export const adminDocumentListRanging = defineRanging<
	typeof adminDocumentRangeableFields,
	Prisma.DocumentWhereInput
>(adminDocumentRangeableFields, "createdAt");

export const adminDocumentSearchableFields = [
	"name",
	"slug",
	"book.title",
	"user.username",
	"user.name",
] as const;

export const adminDocumentListSearching = defineSearching<
	typeof adminDocumentSearchableFields,
	Prisma.DocumentWhereInput
>(adminDocumentSearchableFields, {
	where: {
		"book.title": (query) => ({
			book: { title: { contains: query, mode: "insensitive" } },
		}),
		"user.username": (query) => ({
			user: { username: { contains: query, mode: "insensitive" } },
		}),
		"user.name": (query) => ({
			user: { name: { contains: query, mode: "insensitive" } },
		}),
	},
});

export const adminDocumentListFiltersSchema = z
	.object({
		statuses: z.array(DocumentStatusSchema),
		languages: z.array(z.enum(DOCUMENT_LANGUAGE_CODES)),
		bookSlugs: z.array(BookSchema.shape.slug),
		submitterUsernames: z.array(UserSchema.shape.username),
		hasAcceptanceNotes: z.boolean(),
		hasRejectionReason: z.boolean(),
	})
	.partial();

export type AdminDocumentListFilters = z.infer<
	typeof adminDocumentListFiltersSchema
>;
