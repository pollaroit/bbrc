import { UserSchema } from "@bbrc/schemas";
import { isAuthorSlug } from "@bbrc/shared";
import zod from "zod";

export const GetAuthorPageInputSchema = zod
	.string()
	.refine(isAuthorSlug, { message: "Invalid author slug" });

export const AuthorPageReaderSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	readCount: zod.number().int().min(1),
});

export const AuthorPageFanSchema = zod.object({
	username: UserSchema.shape.username,
	name: UserSchema.shape.name,
	image: UserSchema.shape.image,
	averageRating: zod.number().min(0).max(5),
	ratingCount: zod.number().int().min(1),
});

export const AuthorPageSimilarAuthorSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	bookCount: zod.number().int().min(1),
	score: zod.number().min(0),
});

export const GetAuthorPageOutputSchema = zod.object({
	slug: zod.string(),
	name: zod.string(),
	bookCount: zod.number().int().min(0),
	bestReaders: zod.array(AuthorPageReaderSchema),
	biggestFans: zod.array(AuthorPageFanSchema),
	similarAuthors: zod.array(AuthorPageSimilarAuthorSchema),
});

export type GetAuthorPageOutput = zod.infer<typeof GetAuthorPageOutputSchema>;
