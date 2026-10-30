import { notBannedProcedure } from "../../procedures";
import { loadViewer } from "../visibility/viewer";
import {
	CompareBooksInputSchema,
	CompareBooksOutputSchema,
	CompareExtrasInputSchema,
	CompareExtrasOutputSchema,
	CompareInputSchema,
	CompareOutputSchema,
	ComparePreferencesSchema,
	CompareSearchMembersInputSchema,
	CompareSearchMembersOutputSchema,
} from "./user-compare.schema";
import {
	compareMembers,
	getComparePreferences,
	listCompareBooks,
	searchCompareMembers,
	setComparePreferences,
} from "./user-compare.service";
import { getCompareExtras } from "./user-compare-extras.service";

/** Compare the reading of two members. See the schema file for the access rules and outputs. */
export const userCompareRouter = {
	compare: notBannedProcedure
		.input(CompareInputSchema)
		.output(CompareOutputSchema)
		.handler(async ({ input, context }) =>
			compareMembers(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	books: notBannedProcedure
		.input(CompareBooksInputSchema)
		.output(CompareBooksOutputSchema)
		.handler(async ({ input, context }) =>
			listCompareBooks(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	extras: notBannedProcedure
		.input(CompareExtrasInputSchema)
		.output(CompareExtrasOutputSchema)
		.handler(async ({ input, context }) =>
			getCompareExtras(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	searchMembers: notBannedProcedure
		.input(CompareSearchMembersInputSchema)
		.output(CompareSearchMembersOutputSchema)
		.handler(async ({ input, context }) =>
			searchCompareMembers(
				input,
				context.db,
				await loadViewer(context.db, context.session),
			),
		),

	getPreferences: notBannedProcedure
		.output(ComparePreferencesSchema)
		.handler(({ context }) =>
			getComparePreferences(context.db, context.session.user.id),
		),

	setPreferences: notBannedProcedure
		.input(ComparePreferencesSchema)
		.output(ComparePreferencesSchema)
		.handler(({ input, context }) =>
			setComparePreferences(context.db, context.session.user.id, input),
		),
};
