import type {
	GetBookListAuthorFacetsInput,
	GetBookListCountryFacetsInput,
} from "@bbrc/api/modules/book/book.schema";
import {
	type CreateSittingInput,
	CreateSittingInputSchema,
	type PreviewSittingPollOptionsInput,
} from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingJoinConfigSchema } from "@bbrc/api/modules/sitting/sitting-join.schema";
import {
	DEFAULT_SITTING_JOIN_CONFIG,
	defaultPollDeadline,
	normalizeBookCountryCodes,
} from "@bbrc/shared";
import zod from "zod";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";

function emptyToUndefined(value: unknown) {
	return value === "" || value === null ? undefined : value;
}

const optionalInt = zod.preprocess(
	emptyToUndefined,
	zod.coerce.number().int().min(0).optional(),
);

const optionalRating = zod.preprocess(
	emptyToUndefined,
	zod.coerce.number().min(0).max(5).optional(),
);

export const CreateSittingFormSchema = zod
	.object({
		pollDeadline: zod.date(),
		participantUserIds: zod.array(zod.string().uuid()).min(1),
		/** Who can join by themselves, and when. */
		join: SittingJoinConfigSchema,
		poll: zod.object({
			minPages: optionalInt,
			maxPages: optionalInt,
			minPublishedIn: optionalInt,
			maxPublishedIn: optionalInt,
			minOpenLibraryRating: optionalRating,
			minReads: optionalInt,
			maxReads: optionalInt,
			countries: zod.array(zod.string()).default([]),
			authors: zod.array(zod.string()).default([]),
			take: zod.preprocess(
				emptyToUndefined,
				zod.coerce.number().int().min(3).max(12),
			),
			minChoices: zod.preprocess(
				emptyToUndefined,
				zod.coerce.number().int().min(1).max(12),
			),
			maxChoices: zod.preprocess(
				emptyToUndefined,
				zod.coerce.number().int().min(1).max(12),
			),
		}),
	})
	.superRefine((value, ctx) => {
		CreateSittingInputSchema.safeParse({
			pollDeadline: value.pollDeadline,
			participantUserIds: value.participantUserIds,
			poll: pollFromFormValues(value),
		}).error?.issues.forEach((issue) => {
			const path =
				issue.path[0] === "poll"
					? ["poll", ...issue.path.slice(1)]
					: issue.path;
			ctx.addIssue({ ...issue, path });
		});
	});

export type CreateSittingFormValues = zod.infer<typeof CreateSittingFormSchema>;

export function defaultCreatePollDeadline(): Date {
	return defaultPollDeadline();
}

function pollFromFormValues(values: CreateSittingFormValues) {
	const poll = values.poll;
	return {
		minPages: poll.minPages,
		maxPages: poll.maxPages,
		minPublishedIn: poll.minPublishedIn,
		maxPublishedIn: poll.maxPublishedIn,
		minOpenLibraryRating: poll.minOpenLibraryRating,
		minReads: poll.minReads,
		maxReads: poll.maxReads,
		countries: poll.countries.length > 0 ? poll.countries : undefined,
		authors: poll.authors.length > 0 ? poll.authors : undefined,
		take: poll.take,
		minChoices: poll.minChoices,
		maxChoices: poll.maxChoices,
	};
}

/**
 * Poll config for live previews (e.g. the pool-size count). Returns null while
 * the form holds values that cannot be sent yet.
 */
export function livePollInputFromForm(
	rawPoll: unknown,
): ReturnType<typeof pollFromFormValues> | null {
	const parsed = CreateSittingFormSchema.shape.poll.safeParse(rawPoll);
	if (!parsed.success) {
		return null;
	}

	const poll = pollFromFormValues({
		pollDeadline: new Date(),
		participantUserIds: [],
		join: DEFAULT_SITTING_JOIN_CONFIG,
		poll: parsed.data,
	});

	return poll.minChoices > poll.maxChoices ? null : poll;
}

export type WishlistPollFilterSlice = Pick<
	CreateSittingFormValues["poll"],
	| "minPages"
	| "maxPages"
	| "minPublishedIn"
	| "maxPublishedIn"
	| "minOpenLibraryRating"
	| "minReads"
	| "maxReads"
	| "countries"
	| "authors"
>;

function wishlistPollListFilters(
	poll: WishlistPollFilterSlice,
): Partial<GetBookListAuthorFacetsInput> {
	const countries =
		poll.countries.length > 0
			? normalizeBookCountryCodes(poll.countries)
			: undefined;

	return buildListCallInput({
		statuses: ["wishlist"] as const,
		minPages: poll.minPages,
		maxPages: poll.maxPages,
		minPublishedIn: poll.minPublishedIn,
		maxPublishedIn: poll.maxPublishedIn,
		minOpenLibraryRating: poll.minOpenLibraryRating,
		minReads: poll.minReads,
		maxReads: poll.maxReads,
		countries: countries && countries.length > 0 ? countries : undefined,
		authors: poll.authors.length > 0 ? poll.authors : undefined,
	}) as Partial<GetBookListAuthorFacetsInput>;
}

/** Author facet list: respects countries and other filters, not the author filter itself. */
export function toWishlistPollAuthorFacetsInput(
	poll: WishlistPollFilterSlice,
): Partial<GetBookListAuthorFacetsInput> {
	const { authors: _authors, ...rest } = wishlistPollListFilters(poll);
	return rest;
}

/** Country facet list: respects authors and other filters, not the country filter itself. */
export function toWishlistPollCountryFacetsInput(
	poll: WishlistPollFilterSlice,
): Partial<GetBookListCountryFacetsInput> {
	const { countries: _countries, ...rest } = wishlistPollListFilters(poll);
	return rest;
}

export function toPreviewSittingPollOptionsInput(
	values: CreateSittingFormValues,
): PreviewSittingPollOptionsInput {
	return {
		participantUserIds: values.participantUserIds,
		poll: pollFromFormValues(values),
	};
}

export function toCreateSittingInput(
	values: CreateSittingFormValues,
	optionBookIds: string[],
	nominatedBookIds: string[] = [],
): CreateSittingInput {
	return {
		pollDeadline: values.pollDeadline,
		participantUserIds: values.participantUserIds,
		join: values.join,
		poll: pollFromFormValues(values),
		optionBookIds,
		nominatedBookIds,
	};
}

export const defaultCreateSittingFormValues: CreateSittingFormValues = {
	pollDeadline: defaultCreatePollDeadline(),
	participantUserIds: [],
	join: DEFAULT_SITTING_JOIN_CONFIG,
	poll: {
		take: 10,
		minChoices: 1,
		maxChoices: 10,
		countries: [],
		authors: [],
	},
};
