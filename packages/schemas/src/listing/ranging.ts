import z from "zod";

const rangeDateSchema = z.coerce.date();

export function refineRangingBounds(
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) {
	if (value.rangeMin && value.rangeMax && value.rangeMin > value.rangeMax) {
		ctx.addIssue({
			code: "custom",
			message: "rangeMin must be before or equal to rangeMax",
			path: ["rangeMax"],
		});
	}
}

export function createRangingInputSchema<
	const TFields extends readonly [string, ...string[]],
>(fields: TFields, defaultField: TFields[number]) {
	return z
		.object({
			rangeBy: z.enum(fields).default(defaultField),
			rangeMin: rangeDateSchema.optional(),
			rangeMax: rangeDateSchema.optional(),
		})
		.superRefine(refineRangingBounds);
}

export function createRangingMetadataSchema<
	const TFields extends readonly [string, ...string[]],
>(fields: TFields) {
	return z.object({
		rangeBy: z.enum(fields),
		rangeMin: z.date().optional(),
		rangeMax: z.date().optional(),
	});
}

export type TRangingInput<TSchema extends z.ZodType> = z.infer<TSchema>;

export type TRangingMetadata<TSchema extends z.ZodType> = z.infer<TSchema>;
