import { bookCountriesSchema } from "@bbrc/shared";
import zod from "zod";

const idSchema = zod.string().uuid();

const dateInputSchema = zod
	.object({
		year: zod.number().int().min(-3000).max(2200),
		month: zod.number().int().min(1).max(12).nullish(),
		day: zod.number().int().min(1).max(31).nullish(),
	})
	.refine((value) => value.day == null || value.month != null, {
		message: "A day needs a month.",
	});

export const AuthorGenderSchema = zod.enum([
	"female",
	"male",
	"non_binary",
	"other",
	"unknown",
]);

const httpsUrl = zod
	.string()
	.trim()
	.max(2048)
	.url()
	.refine((value) => value.startsWith("https://"), {
		message: "Use an https:// link.",
	});

/** The fields an admin can edit by hand (an editable name, bio, dates, places, links). */
export const AuthorEditableFieldsSchema = zod.object({
	name: zod.string().trim().min(1).max(200),
	sortName: zod.string().trim().max(200).nullable(),
	bio: zod.string().trim().max(2000).nullable(),
	birth: dateInputSchema.nullable(),
	death: dateInputSchema.nullable(),
	birthPlace: zod.string().trim().max(200).nullable(),
	deathPlace: zod.string().trim().max(200).nullable(),
	nationalities: bookCountriesSchema,
	gender: AuthorGenderSchema,
	wikipediaUrl: httpsUrl.nullable(),
	goodreadsUrl: httpsUrl.nullable(),
	websiteUrl: httpsUrl.nullable(),
	openLibraryId: zod
		.string()
		.regex(/^OL\d+A$/, "Open Library author ids look like OL26320A")
		.nullable(),
	wikidataId: zod
		.string()
		.regex(/^Q\d+$/, "Wikidata ids look like Q892")
		.nullable(),
});

export const SearchAuthorsInputSchema = zod.object({
	query: zod.string().trim().max(120),
});

export const CreateAuthorInputSchema = zod.object({
	name: zod.string().trim().min(1).max(200),
	/** From an Open Library suggestion: pins the record and finds an existing author with it. */
	openLibraryId: zod
		.string()
		.regex(/^OL\d+A$/)
		.optional(),
	/** "Different person": create even though a same or alike author exists. */
	force: zod.boolean().optional(),
});

const UpdateAuthorShape = AuthorEditableFieldsSchema.partial().extend({
	id: idSchema,
});

/**
 * Annotated with its plain type: zod's own inferred object type is very large and, with every
 * router in one `appRouter`, would push the router's declaration past the compiler's size limit.
 */
export type UpdateAuthorInput = zod.infer<typeof UpdateAuthorShape>;
export const UpdateAuthorInputSchema: zod.ZodType<UpdateAuthorInput> =
	UpdateAuthorShape;

export const AUTHOR_LOCKABLE_FIELDS = [
	"name",
	"sortName",
	"bio",
	"birth",
	"death",
	"birthPlace",
	"deathPlace",
	"nationalities",
	"gender",
	"wikipediaUrl",
	"goodreadsUrl",
	"websiteUrl",
	"photo",
] as const;

export const AuthorFieldSchema = zod.enum(AUTHOR_LOCKABLE_FIELDS);

export const SetAuthorLockInputSchema = zod.object({
	id: idSchema,
	field: AuthorFieldSchema,
	locked: zod.boolean(),
});

export const AuthorIdInputSchema = zod.object({ id: idSchema });

export const GetAuthorForEditInputSchema = zod.object({
	slug: zod.string().min(1).max(80),
});

export const AddAuthorAliasInputSchema = zod.object({
	id: idSchema,
	alias: zod.string().trim().min(1).max(200),
});

export const RemoveAuthorAliasInputSchema = zod.object({
	id: idSchema,
	aliasId: idSchema,
});

export const RefreshAuthorInputSchema = zod.object({
	id: idSchema,
	/** Only these fields (left out: every field that is not locked or hand-edited). */
	fields: zod
		.array(
			zod.enum([
				"bio",
				"birth",
				"death",
				"birthPlace",
				"deathPlace",
				"nationalities",
				"gender",
				"wikipediaUrl",
				"goodreadsUrl",
				"websiteUrl",
			]),
		)
		.max(10)
		.optional(),
});

export const MergeAuthorsInputSchema = zod.object({
	fromId: idSchema,
	intoId: idSchema,
});

export const UploadAuthorPhotoInputSchema = zod.object({
	id: idSchema,
	/** The address `POST /api/storage/upload` (target "author-photo") returned. */
	photoUrl: zod.string().url().max(2048),
	credit: zod.string().trim().max(300).nullish(),
	license: zod.string().trim().max(120).nullish(),
	sourceUrl: httpsUrl.nullish(),
});

export const ReviewQueueInputSchema = zod.object({
	limit: zod.number().int().min(1).max(100).default(50),
});
