import type z from "zod";
import { OffsetPaginationInputSchema } from "./pagination";
import { refineRangingBounds } from "./ranging";

type ListingObjectSchema = z.ZodObject;

type ListingInputSchemaPart =
	| ListingObjectSchema
	| { inputSchema: ListingObjectSchema };

function resolveListingInputSchema(
	part: ListingInputSchemaPart,
): ListingObjectSchema {
	return "inputSchema" in part ? part.inputSchema : part;
}

export type CreateListInputSchemaConfig = {
	/** Resource-specific filters (usually `.partial()`). */
	filters?: ListingObjectSchema;
	pagination?: ListingObjectSchema;
	sorting?: ListingInputSchemaPart;
	ranging?: ListingInputSchemaPart;
	searching?: ListingInputSchemaPart;
};

type InferFilters<T> = T extends ListingObjectSchema
	? z.infer<T>
	: Record<string, never>;

type InferListingPart<T> = [T] extends [undefined]
	? Record<string, never>
	: T extends { inputSchema: infer S extends ListingObjectSchema }
		? z.infer<S>
		: T extends ListingObjectSchema
			? z.infer<T>
			: Record<string, never>;

export type InferListInput<C extends CreateListInputSchemaConfig> =
	InferFilters<C["filters"]> &
		z.infer<
			C["pagination"] extends ListingObjectSchema
				? C["pagination"]
				: typeof OffsetPaginationInputSchema
		> &
		InferListingPart<C["sorting"]> &
		InferListingPart<C["ranging"]> &
		InferListingPart<C["searching"]>;

/**
 * Build a list endpoint input schema (Zod 4).
 *
 * Composes filters + pagination + sorting + ranging + search using `.extend(part.shape)`.
 * Applies ranging cross-field validation when `ranging` is set.
 */
export function createListInputSchema<
	const C extends CreateListInputSchemaConfig,
>(config: C): z.ZodType<InferListInput<C>> {
	const pagination = config.pagination ?? OffsetPaginationInputSchema;

	let schema: ListingObjectSchema = config.filters
		? config.filters.extend(pagination.shape)
		: pagination;

	if (config.sorting) {
		schema = schema.extend(resolveListingInputSchema(config.sorting).shape);
	}
	if (config.ranging) {
		schema = schema.extend(resolveListingInputSchema(config.ranging).shape);
	}
	if (config.searching) {
		schema = schema.extend(resolveListingInputSchema(config.searching).shape);
	}

	if (config.ranging) {
		schema = schema.superRefine((value, ctx) => {
			const parsed = value as { rangeMin?: Date; rangeMax?: Date };
			refineRangingBounds(
				{ rangeMin: parsed.rangeMin, rangeMax: parsed.rangeMax },
				ctx,
			);
		});
	}

	return schema as unknown as z.ZodType<InferListInput<C>>;
}

/** @deprecated Use `createListInputSchema`. */
export function extendListingInput(
	base: ListingObjectSchema,
	...parts: ListingObjectSchema[]
): ListingObjectSchema {
	let schema = base;
	for (const part of parts) {
		schema = schema.extend(part.shape);
	}
	return schema;
}
