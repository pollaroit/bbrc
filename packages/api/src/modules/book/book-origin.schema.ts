import { BookSchema } from "@bbrc/schemas";
import { bookCountriesSchema } from "@bbrc/shared";
import { z } from "zod";

export const SuggestBookOriginCountriesInputSchema = z.object({
	title: BookSchema.shape.title,
	authors: BookSchema.shape.authors,
	publishedIn: BookSchema.shape.publishedIn,
	excerpt: z.string().trim().max(4000).optional(),
});

export type SuggestBookOriginCountriesInput = z.infer<
	typeof SuggestBookOriginCountriesInputSchema
>;

export const SuggestBookOriginCountriesOutputSchema = z.object({
	countries: bookCountriesSchema,
});

export type SuggestBookOriginCountriesOutput = z.infer<
	typeof SuggestBookOriginCountriesOutputSchema
>;

export const bookOriginCountriesGeminiSchema = {
	type: "object",
	properties: {
		countries: {
			type: "array",
			items: {
				type: "string",
				description:
					"ISO 3166-1 alpha-2 code (uppercase) for a modern sovereign state",
			},
			description:
				"Countries whose literary tradition this work belongs to (author nationality / origin), not where the story is set. Usually one entry; use several only for clear multi-national authorship.",
		},
	},
	required: ["countries"],
} as const;

const geminiOriginDraftSchema = z.object({
	countries: z.array(z.string()),
});

export function parseGeminiOriginDraft(value: unknown) {
	const draft = geminiOriginDraftSchema.parse(value);
	return { countries: draft.countries };
}
