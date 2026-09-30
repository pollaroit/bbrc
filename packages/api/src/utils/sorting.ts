import {
	createSortingInputSchema,
	type SortDirection,
	type TSortingInput,
} from "@bbrc/schemas/listing/sorting";

type SortField = string;

export type SortOrderByResolver<TOrderBy> = (
	direction: SortDirection,
) => TOrderBy;

export type SortOrderByMap<
	TFields extends readonly SortField[],
	TOrderBy,
> = Partial<Record<TFields[number], SortOrderByResolver<TOrderBy>>>;

export interface SortingContext<TOrderBy> {
	readonly sortBy: string;
	readonly sortDirection: SortDirection;
	/** Prisma `orderBy` value for the active sort. */
	use(): TOrderBy;
	meta(): { sortBy: string; sortDirection: SortDirection };
}

export interface SortingDefinition<
	TFields extends readonly [SortField, ...SortField[]],
	TOrderBy,
> {
	readonly fields: TFields;
	readonly inputSchema: ReturnType<typeof createSortingInputSchema<TFields>>;
	readonly defaults: {
		sortBy: TFields[number];
		sortDirection: SortDirection;
	};
	from(input: unknown): SortingContext<TOrderBy>;
}

function flatOrderBy<TOrderBy>(
	field: string,
	direction: SortDirection,
): TOrderBy {
	return { [field]: direction } as TOrderBy;
}

/**
 * Declares allowed sort keys for list endpoints and maps them to Prisma `orderBy`.
 *
 * Simple scalar fields use flat `{ field: direction }` automatically.
 * Relation aggregates and other non-scalar sorts use `orderBy` resolvers:
 *
 * @example
 * defineSorting(["createdAt", "posts._count"], "createdAt", "desc", {
 *   orderBy: {
 *     "posts._count": (direction) => ({ posts: { _count: direction } }),
 *   },
 * });
 */
export function defineSorting<
	const TFields extends readonly [SortField, ...SortField[]],
	TOrderBy = Record<string, unknown>,
>(
	fields: TFields,
	defaultField: TFields[number],
	defaultDirection: SortDirection = "desc",
	config?: {
		orderBy?: SortOrderByMap<TFields, TOrderBy>;
	},
): SortingDefinition<TFields, TOrderBy> {
	const inputSchema = createSortingInputSchema(
		fields,
		defaultField,
		defaultDirection,
	);

	const orderBy: SortOrderByMap<TFields, TOrderBy> = config?.orderBy ?? {};

	return {
		fields,
		inputSchema,
		defaults: {
			sortBy: defaultField,
			sortDirection: defaultDirection,
		},
		from(input: unknown): SortingContext<TOrderBy> {
			const parsed = inputSchema.parse(input) as TSortingInput<
				typeof inputSchema
			>;

			const resolve = (): TOrderBy => {
				const custom = orderBy[parsed.sortBy as TFields[number]];
				if (custom) {
					return custom(parsed.sortDirection);
				}
				return flatOrderBy(parsed.sortBy, parsed.sortDirection);
			};

			return {
				sortBy: parsed.sortBy,
				sortDirection: parsed.sortDirection,
				use: resolve,
				meta: () => ({
					sortBy: parsed.sortBy,
					sortDirection: parsed.sortDirection,
				}),
			};
		},
	};
}
