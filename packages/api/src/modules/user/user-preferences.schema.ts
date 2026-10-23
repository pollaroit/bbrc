import zod from "zod";

/** Preferences come back normalized, so clients never see invalid values. */
export const MyPreferencesSchema = zod.object({
	appearance: zod.object({
		mode: zod.string(),
		palette: zod.string(),
		fontBody: zod.string(),
		fontHeading: zod.string(),
		fontReading: zod.string(),
		textSize: zod.string(),
		lineSpacing: zod.string(),
	}),
	accessibility: zod.object({ motion: zod.string(), contrast: zod.string() }),
	reading: zod.object({ spoilers: zod.string() }),
	time: zod.object({ zone: zod.string(), clock: zod.string() }),
});

export const GetMyPreferencesOutputSchema = zod.object({
	/** Null until the member saves preferences for the first time. */
	preferences: MyPreferencesSchema.nullable(),
});

export const UpdateMyPreferencesInputSchema = zod.object({
	/** Any shape: the server keeps only the values it recognises. */
	preferences: zod.unknown(),
});

export const UpdateMyPreferencesOutputSchema = zod.object({
	preferences: MyPreferencesSchema,
});
