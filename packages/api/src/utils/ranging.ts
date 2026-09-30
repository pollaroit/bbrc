import {
	createRangingInputSchema,
	type TRangingInput,
} from "@bbrc/schemas/listing/ranging";

type RangeField = string;

export type DateRangeBounds = {
	from?: Date;
	to?: Date;
};

export type RangingWhereResolver<TWhere> = (range: DateRangeBounds) => TWhere;

export type RangingWhereMap<
	TFields extends readonly RangeField[],
	TWhere,
> = Partial<Record<TFields[number], RangingWhereResolver<TWhere>>>;

export interface RangingContext<TWhere> {
	readonly rangeBy: string;
	readonly rangeMin?: Date;
	readonly rangeMax?: Date;
	/** Whether any date bound was provided. */
	isActive(): boolean;
	/** Prisma `where` fragment; `{}` when no bounds are set. */
	use(): TWhere;
	meta(): {
		rangeBy: string;
		rangeMin?: Date;
		rangeMax?: Date;
	};
}

export interface RangingDefinition<
	TFields extends readonly [RangeField, ...RangeField[]],
	TWhere,
> {
	readonly fields: TFields;
	readonly inputSchema: ReturnType<typeof createRangingInputSchema<TFields>>;
	readonly defaults: {
		rangeBy: TFields[number];
	};
	from(input: unknown): RangingContext<TWhere>;
}

function flatDateWhere<TWhere>(field: string, bounds: DateRangeBounds): TWhere {
	if (!bounds.from && !bounds.to) {
		return {} as TWhere;
	}

	const filter: { gte?: Date; lte?: Date } = {};
	if (bounds.from) {
		filter.gte = bounds.from;
	}
	if (bounds.to) {
		filter.lte = bounds.to;
	}

	return { [field]: filter } as TWhere;
}

/**
 * Declares date fields list endpoints can filter on (`rangeMin` / `rangeMax`).
 *
 * Scalar model date fields map to `{ [field]: { gte, lte } }` automatically.
 * Non-scalar cases can use `where` resolvers (same idea as sorting `orderBy`).
 */
export function defineRanging<
	const TFields extends readonly [RangeField, ...RangeField[]],
	TWhere = Record<string, unknown>,
>(
	fields: TFields,
	defaultField: TFields[number],
	config?: {
		where?: RangingWhereMap<TFields, TWhere>;
	},
): RangingDefinition<TFields, TWhere> {
	const inputSchema = createRangingInputSchema(fields, defaultField);
	const whereResolvers: RangingWhereMap<TFields, TWhere> = config?.where ?? {};

	return {
		fields,
		inputSchema,
		defaults: {
			rangeBy: defaultField,
		},
		from(input: unknown): RangingContext<TWhere> {
			const parsed = inputSchema.parse(input) as TRangingInput<
				typeof inputSchema
			>;

			const bounds: DateRangeBounds = {
				from: parsed.rangeMin,
				to: parsed.rangeMax,
			};

			const resolve = (): TWhere => {
				if (!bounds.from && !bounds.to) {
					return {} as TWhere;
				}

				const custom = whereResolvers[parsed.rangeBy as TFields[number]];
				if (custom) {
					return custom(bounds);
				}

				return flatDateWhere(parsed.rangeBy, bounds);
			};

			return {
				rangeBy: parsed.rangeBy,
				rangeMin: parsed.rangeMin,
				rangeMax: parsed.rangeMax,
				isActive: () => bounds.from !== undefined || bounds.to !== undefined,
				use: resolve,
				meta: () => ({
					rangeBy: parsed.rangeBy,
					rangeMin: parsed.rangeMin,
					rangeMax: parsed.rangeMax,
				}),
			};
		},
	};
}
