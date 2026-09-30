import z from "zod";

const sortDirectionSchema = z.enum(["asc", "desc"]);

export type SortDirection = z.infer<typeof sortDirectionSchema>;

export function createSortingInputSchema<
	const TFields extends readonly [string, ...string[]],
>(
	fields: TFields,
	defaultField: TFields[number],
	defaultDirection: SortDirection = "desc",
) {
	return z.object({
		sortBy: z.enum(fields).default(defaultField),
		sortDirection: sortDirectionSchema.default(defaultDirection),
	});
}

export function createSortingMetadataSchema<
	const TFields extends readonly [string, ...string[]],
>(fields: TFields) {
	return z.object({
		sortBy: z.enum(fields),
		sortDirection: sortDirectionSchema,
	});
}

export type TSortingInput<TSchema extends z.ZodType> = z.infer<TSchema>;

export type TSortingMetadata<TSchema extends z.ZodType> = z.infer<TSchema>;
