import { validationError } from "@bbrc/i18n";
import {
	isFeedbackRatingStep,
	RATING_DEFINITION_MAX_LENGTH,
} from "@bbrc/shared";
import zod from "zod";

const RatingSchema = zod
	.number()
	.refine((value) => isFeedbackRatingStep(value), {
		error: validationError("rating.halfSteps"),
	});

/** The member's own wording, by rating key ("4.5"). A rating missing here uses the default. */
export const ListMyRatingDefinitionsOutputSchema = zod.object({
	overrides: zod.record(zod.string(), zod.string()),
});

export const SetRatingDefinitionInputSchema = zod.object({
	rating: RatingSchema,
	text: zod
		.string()
		.trim()
		.min(1, { error: validationError("ratingDefinition.empty") })
		.max(RATING_DEFINITION_MAX_LENGTH, {
			error: validationError("ratingDefinition.tooLong", {
				max: RATING_DEFINITION_MAX_LENGTH,
			}),
		}),
});

export const ResetRatingDefinitionInputSchema = zod.object({
	rating: RatingSchema,
});

export const RatingDefinitionMutationOutputSchema = zod.object({
	rating: zod.number(),
	text: zod.string().nullable(),
});
