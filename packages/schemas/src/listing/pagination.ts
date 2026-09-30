import z from "zod";

const paginationLimitSchema = z.number().int().min(1).max(100).default(10);

export const OffsetPaginationInputSchema = z.object({
	page: z.number().int().min(1).default(1),
	limit: paginationLimitSchema,
});

export const OffsetPaginationMetadataSchema = z.object({
	page: z.number().int().min(1),
	limit: z.number().int().min(1).max(100),
	total: z.number().int().min(0),
	totalPages: z.number().int().min(0),
	hasNextPage: z.boolean(),
	nextPage: z.number().int().min(1).nullable(),
	prevPage: z.number().int().min(1).nullable(),
});

export const OffsetPaginationOutputSchema = <T extends z.ZodType>(item: T) =>
	z.object({
		items: z.array(item),
		metadata: OffsetPaginationMetadataSchema,
	});

export type TOffsetPaginationInputSchema = z.infer<
	typeof OffsetPaginationInputSchema
>;
export type TOffsetPaginationMetadataSchema = z.infer<
	typeof OffsetPaginationMetadataSchema
>;

export type TOffsetPaginationOutputSchema<TItem extends z.ZodType> = {
	items: z.infer<TItem>[];
	metadata: TOffsetPaginationMetadataSchema;
};

export const CursorPaginationInputSchema = z.object({
	cursor: z.string().min(1).optional(),
	limit: paginationLimitSchema,
});

export const CursorPaginationMetadataSchema = z.object({
	limit: z.number().int().min(1).max(100),
	hasNextPage: z.boolean(),
	hasPreviousPage: z.boolean(),
	nextCursor: z.string().nullable(),
});

export const CursorPaginationOutputSchema = <T extends z.ZodType>(item: T) =>
	z.object({
		items: z.array(item),
		metadata: CursorPaginationMetadataSchema,
	});

export type TCursorPaginationInputSchema = z.infer<
	typeof CursorPaginationInputSchema
>;
export type TCursorPaginationMetadataSchema = z.infer<
	typeof CursorPaginationMetadataSchema
>;

export type TCursorPaginationOutputSchema<TItem extends z.ZodType> = {
	items: z.infer<TItem>[];
	metadata: TCursorPaginationMetadataSchema;
};
