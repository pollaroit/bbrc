import { adminProcedure } from "../../procedures";
import {
	CompareBooksInputSchema,
	CompareBooksOutputSchema,
	CompareExtrasInputSchema,
	CompareExtrasOutputSchema,
	CompareInputSchema,
	CompareOutputSchema,
} from "../user-compare/user-compare.schema";
import {
	compareMembers,
	listCompareBooks,
} from "../user-compare/user-compare.service";
import { getCompareExtras } from "../user-compare/user-compare-extras.service";
import { loadViewer } from "../visibility/viewer";
import {
	CompareStatsInputSchema,
	CompareStatsOutputSchema,
	SearchCompareMembersInputSchema,
	SearchCompareMembersOutputSchema,
} from "./user-compare-admin.schema";
import {
	getCompareStats,
	searchCompareMembers,
} from "./user-compare-admin.service";

/**
 * Compare any two members and the club-wide similarity stats. See the schema file.
 *
 * `compare`, `books` and `extras` are the member compare procedures with the same inputs and
 * outputs (see `user-compare.schema.ts`); for an admin viewer they already skip the "must be one
 * of the two" rule and "Allow others to compare with me", and hidden or banned members can be
 * compared. They exist here so the admin pages call one namespace.
 */
export const userCompareAdminRouter = {
	compare: adminProcedure
		.input(CompareInputSchema)
		.output(CompareOutputSchema)
		.handler(async ({ input, context }) =>
			compareMembers(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	books: adminProcedure
		.input(CompareBooksInputSchema)
		.output(CompareBooksOutputSchema)
		.handler(async ({ input, context }) =>
			listCompareBooks(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	extras: adminProcedure
		.input(CompareExtrasInputSchema)
		.output(CompareExtrasOutputSchema)
		.handler(async ({ input, context }) =>
			getCompareExtras(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	searchMembers: adminProcedure
		.input(SearchCompareMembersInputSchema)
		.output(SearchCompareMembersOutputSchema)
		.handler(({ input, context }) => searchCompareMembers(input, context.db)),

	stats: adminProcedure
		.input(CompareStatsInputSchema)
		.output(CompareStatsOutputSchema)
		.handler(({ input, context }) => getCompareStats(input, context.db)),
};
