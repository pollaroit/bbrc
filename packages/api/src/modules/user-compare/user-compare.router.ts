import { notBannedProcedure } from "../../procedures";
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
		.handler(({ input, context }) =>
			compareMembers(input, context.db, context.session),
		),

	books: notBannedProcedure
		.input(CompareBooksInputSchema)
		.output(CompareBooksOutputSchema)
		.handler(({ input, context }) =>
			listCompareBooks(input, context.db, context.session),
		),

	extras: notBannedProcedure
		.input(CompareExtrasInputSchema)
		.output(CompareExtrasOutputSchema)
		.handler(({ input, context }) =>
			getCompareExtras(input, context.db, context.session),
		),

	searchMembers: notBannedProcedure
		.input(CompareSearchMembersInputSchema)
		.output(CompareSearchMembersOutputSchema)
		.handler(({ input, context }) =>
			searchCompareMembers(input, context.db, context.session),
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
