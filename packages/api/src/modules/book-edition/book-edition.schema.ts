import { isValidIsbn, normalizeIsbn } from "@bbrc/shared";
import { z } from "zod";

/** Open Library language codes we offer for now; add more here. */
export const BOOK_EDITION_LANGUAGES = ["eng", "tur", "rus", "aze"] as const;
export const BookEditionLanguageSchema = z.enum(BOOK_EDITION_LANGUAGES);

export const BOOK_EDITION_FORMATS = [
	"paperback",
	"hardcover",
	"ebook",
	"audiobook",
	"other",
] as const;
export const BookEditionFormatSchema = z.enum(BOOK_EDITION_FORMATS);

export const MAX_EDITIONS_PER_MEMBER_PER_DAY = 5;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((value) => (value === "" ? null : value))
		.nullish();

const isbnField = z
	.string()
	.trim()
	.refine((value) => value === "" || isValidIsbn(value), {
		message: "That is not a valid ISBN.",
	})
	.transform((value) => (value === "" ? null : normalizeIsbn(value)))
	.nullish();

export const BookEditionFieldsSchema = z.object({
	title: optionalText(300),
	language: BookEditionLanguageSchema,
	pages: z.number().int().min(1).max(20000),
	/** Either form of an ISBN; both are stored when they can be worked out. */
	isbn: isbnField,
	publisher: optionalText(200),
	publishedYear: z.number().int().min(1000).max(2100).nullish(),
	format: BookEditionFormatSchema.default("paperback"),
	translator: optionalText(200),
	notes: optionalText(300),
	/** Our own uploaded cover (see the edition cover upload). */
	coverUrl: z.string().url().max(2048).nullish(),
});

export const CreateBookEditionInputSchema = BookEditionFieldsSchema.extend({
	bookSlug: z.string().min(1).max(160),
});

export const UpdateBookEditionInputSchema =
	BookEditionFieldsSchema.partial().extend({ id: z.string().uuid() });

export const BookEditionIdInputSchema = z.object({ id: z.string().uuid() });

export const MergeBookEditionsInputSchema = z.object({
	fromId: z.string().uuid(),
	intoId: z.string().uuid(),
});

export const ListBookEditionsInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
});

export const BookEditionItemSchema = z.object({
	id: z.string(),
	/** The short address (without the "m-"). */
	publicId: z.string(),
	/** The address to link to: `m-<publicId>`, or the Open Library edition when they are linked. */
	key: z.string(),
	/** The Open Library edition this one is the same as, when an admin linked them. */
	openLibraryOlid: z.string().nullable(),
	title: z.string().nullable(),
	language: z.string(),
	pages: z.number().int(),
	isbn13: z.string().nullable(),
	isbn10: z.string().nullable(),
	publisher: z.string().nullable(),
	publishedYear: z.number().int().nullable(),
	format: BookEditionFormatSchema,
	translator: z.string().nullable(),
	coverUrl: z.string().nullable(),
	notes: z.string().nullable(),
	status: z.enum(["member", "verified"]),
	createdAt: z.coerce.date(),
	verifiedAt: z.coerce.date().nullable(),
	createdBy: z
		.object({
			username: z.string(),
			name: z.string(),
			image: z.string().nullable(),
		})
		.nullable(),
	/** Members reading it now plus members who read this edition. */
	readers: z.number().int().min(0),
	canEdit: z.boolean(),
	canDelete: z.boolean(),
});
export type BookEditionItem = z.infer<typeof BookEditionItemSchema>;

export const ListBookEditionsOutputSchema = z.object({
	items: z.array(BookEditionItemSchema),
	/** How many more this member can add today (null when signed out). */
	addsLeftToday: z.number().int().min(0).nullable(),
});

export const OkSchema = z.object({ ok: z.literal(true) });

export const LinkBookEditionInputSchema = z.object({
	id: z.string().uuid(),
	/** null unlinks. */
	openLibraryOlid: z
		.string()
		.regex(/^OL\d+M$/i)
		.transform((value) => value.toUpperCase())
		.nullable(),
});

export const CheckEditionIsbnInputSchema = z.object({
	bookSlug: z.string().min(1).max(160),
	isbn: z.string().trim().min(10).max(20),
});
export const CheckEditionIsbnOutputSchema = z.object({
	/** The same ISBN is already an Open Library edition of this book. */
	openLibrary: z.object({ key: z.string(), label: z.string() }).nullable(),
	/** A member edition of this book already has it. */
	member: z.object({ key: z.string(), label: z.string() }).nullable(),
});
