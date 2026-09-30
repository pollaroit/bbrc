import z from "zod";

const searchQuerySchema = z
	.string()
	.optional()
	.transform((value) => {
		const trimmed = value?.trim();
		if (!trimmed) {
			return undefined;
		}
		return trimmed;
	});

export function createSearchingInputSchema<
	const TFields extends readonly [string, ...string[]],
>(_fields: TFields) {
	return z.object({
		search: searchQuerySchema,
	});
}

export function createSearchingMetadataSchema() {
	return z.object({
		search: z.string().optional(),
	});
}

export type TSearchingInput<TSchema extends z.ZodType> = z.infer<TSchema>;

export type TSearchingMetadata<TSchema extends z.ZodType> = z.infer<TSchema>;
