import { UserSchema } from "@bbrc/schemas";
import { z } from "zod";
import { ListUserReadsQueryInputSchema } from "./read.schema";

export const userReadExportFieldKeys = [
	"title",
	"authors",
	"slug",
	"olid",
	"status",
	"pages",
	"publishedIn",
	"averageRating",
	"openLibraryRating",
	"readEndYear",
	"readEndMonth",
	"editionId",
	"recordedAt",
	"myRating",
	"myReview",
	"isSpoiler",
	"isbn13",
	"isbn10",
	"publisher",
	"binding",
] as const;

export type UserReadExportFieldKey = (typeof userReadExportFieldKeys)[number];

export const UserReadExportFieldKeySchema = z.enum(userReadExportFieldKeys);

export const defaultUserReadExportFieldKeys = [
	"title",
	"authors",
	"readEndYear",
	"readEndMonth",
	"myRating",
	"recordedAt",
] as const satisfies readonly UserReadExportFieldKey[];

export const ExportUserReadsInputSchema = ListUserReadsQueryInputSchema.extend({
	username: UserSchema.shape.username,
	mutualOnly: z.boolean().optional(),
	limit: z.number().int().min(1).max(5000).optional(),
});

export const UserReadExportRowSchema = z.object({
	title: z.string(),
	authors: z.array(z.string()),
	slug: z.string(),
	olid: z.string(),
	status: z.string(),
	pages: z.number().int(),
	publishedIn: z.number().int(),
	averageRating: z.number().nullable(),
	openLibraryRating: z.number().nullable(),
	readEndYear: z.number().int().nullable(),
	readEndMonth: z.number().int().nullable(),
	editionId: z.string().nullable(),
	recordedAt: z.coerce.date(),
	myRating: z.number().nullable(),
	myReview: z.string().nullable(),
	isSpoiler: z.boolean(),
	isbn13: z.string().nullable(),
	isbn10: z.string().nullable(),
	publisher: z.string().nullable(),
	binding: z.string().nullable(),
});

export const ExportUserReadsOutputSchema = z.object({
	count: z.number().int().nonnegative(),
	items: z.array(UserReadExportRowSchema),
});

export type ExportUserReadsInput = z.infer<typeof ExportUserReadsInputSchema>;
export type ExportUserReadsOutput = z.infer<typeof ExportUserReadsOutputSchema>;
