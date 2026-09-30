import {
	createSearchingInputSchema,
	type TSearchingInput,
} from "@bbrc/schemas/listing/searching";

type SearchField = string;

export type SearchWhereResolver<TWhere> = (query: string) => TWhere;

export type SearchWhereMap<
	TFields extends readonly SearchField[],
	TWhere,
> = Partial<Record<TFields[number], SearchWhereResolver<TWhere>>>;

export interface SearchingContext<TWhere> {
	readonly search?: string;
	isActive(): boolean;
	/** Prisma `where` fragment; `{}` when `search` is empty. */
	use(): TWhere;
	meta(): { search?: string };
}

export interface SearchingDefinition<
	TFields extends readonly [SearchField, ...SearchField[]],
	TWhere,
> {
	readonly fields: TFields;
	readonly inputSchema: ReturnType<typeof createSearchingInputSchema<TFields>>;
	from(input: unknown): SearchingContext<TWhere>;
}

function flatContainsWhere<TWhere>(field: string, query: string): TWhere {
	return {
		[field]: {
			contains: query,
			mode: "insensitive",
		},
	} as TWhere;
}

/**
 * Declares fields matched by the `search` query param (case-insensitive `contains`, OR'd).
 *
 * Non-scalar fields can use `where` resolvers per field key.
 */
export function defineSearching<
	const TFields extends readonly [SearchField, ...SearchField[]],
	TWhere = Record<string, unknown>,
>(
	fields: TFields,
	config?: {
		where?: SearchWhereMap<TFields, TWhere>;
	},
): SearchingDefinition<TFields, TWhere> {
	const inputSchema = createSearchingInputSchema(fields);
	const whereResolvers: SearchWhereMap<TFields, TWhere> = config?.where ?? {};

	return {
		fields,
		inputSchema,
		from(input: unknown): SearchingContext<TWhere> {
			const parsed = inputSchema.parse(input) as TSearchingInput<
				typeof inputSchema
			>;

			const resolve = (): TWhere => {
				const query = parsed.search;
				if (!query) {
					return {} as TWhere;
				}

				const clauses = fields.map((field) => {
					const custom = whereResolvers[field as TFields[number]];
					if (custom) {
						return custom(query);
					}
					return flatContainsWhere<TWhere>(field, query);
				});

				if (clauses.length === 1) {
					return clauses[0] as TWhere;
				}

				return { OR: clauses } as TWhere;
			};

			return {
				search: parsed.search,
				isActive: () => parsed.search !== undefined,
				use: resolve,
				meta: () => ({ search: parsed.search }),
			};
		},
	};
}

/** Combines multiple Prisma `where` fragments with `AND`. */
export function mergeWhereFragments<TWhere extends object>(
	...fragments: TWhere[]
): TWhere {
	const active = fragments.filter(
		(fragment) => Object.keys(fragment).length > 0,
	);
	if (active.length === 0) {
		return {} as TWhere;
	}
	if (active.length === 1) {
		return active[0] as TWhere;
	}
	return { AND: active } as TWhere;
}
