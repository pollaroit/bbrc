import { protectedProcedure } from "../../procedures";
import {
	ListMyRatingDefinitionsOutputSchema,
	RatingDefinitionMutationOutputSchema,
	ResetRatingDefinitionInputSchema,
	SetRatingDefinitionInputSchema,
} from "./rating-definition.schema";
import {
	listMyRatingDefinitions,
	resetRatingDefinition,
	setRatingDefinition,
} from "./rating-definition.service";

export const ratingDefinitionRouter = {
	listMine: protectedProcedure
		.output(ListMyRatingDefinitionsOutputSchema)
		.handler(({ context }) =>
			listMyRatingDefinitions(context.db, context.session.user.id),
		),

	set: protectedProcedure
		.input(SetRatingDefinitionInputSchema)
		.output(RatingDefinitionMutationOutputSchema)
		.handler(({ context, input }) =>
			setRatingDefinition(context.db, context.session.user.id, input),
		),

	reset: protectedProcedure
		.input(ResetRatingDefinitionInputSchema)
		.output(RatingDefinitionMutationOutputSchema)
		.handler(({ context, input }) =>
			resetRatingDefinition(context.db, context.session.user.id, input),
		),
};
