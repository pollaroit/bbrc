import { publicProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	GetPeopleListInputSchema,
	GetPeopleListOutputSchema,
	GetPeopleOverviewOutputSchema,
} from "./people.schema";
import { getPeopleList, getPeopleOverview } from "./people.service";

export const peopleRouter = {
	list: publicProcedure
		.input(GetPeopleListInputSchema)
		.output(GetPeopleListOutputSchema)
		.handler(async ({ input, context }) =>
			getPeopleList(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
	overview: publicProcedure
		.output(GetPeopleOverviewOutputSchema)
		.handler(async ({ context }) =>
			getPeopleOverview(
				context.db,
				await loadViewer(context.db, context.session),
			),
		),
};
