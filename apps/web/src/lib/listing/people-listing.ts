import type { GetPeopleListInput } from "@bbrc/api/modules/people/people.schema";
import {
	PEOPLE_ACTIVITY_FILTERS,
	PEOPLE_SORT_FIELDS,
	PEOPLE_STATUSES,
} from "@bbrc/api/modules/people/people.schema";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	booleanFilterParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export type PeopleActivityFilter = (typeof PEOPLE_ACTIVITY_FILTERS)[number];
export type PeopleSortField = (typeof PEOPLE_SORT_FIELDS)[number];

export const peopleSortLabels = {
	xp: "Experience",
	rp: "Reading points",
	name: "Name",
	createdAt: "Join date",
	streak: "Reading streak",
	achievements: "Achievements",
	averageRating: "Average rating given",
	authors: "Authors read",
	reads: "Books read",
	feedbacks: "Reviews",
	posts: "Posts",
	participations: "Sittings joined",
	shelves: "Shelves",
	favorites: "Favorites",
	quizzes: "Quizzes taken",
	documents: "Documents shared",
} as const satisfies FieldLabels<PeopleSortField>;

export const peopleActivityLabels = {
	readingNow: "Reading in a sitting now",
	hasStreak: "On a reading streak",
	hasReviews: "Has written a review",
	hasPosts: "Has posted",
	hasShelves: "Has a public shelf",
	hasFavorites: "Has favorite books",
	tookQuiz: "Has taken a quiz",
	hasGoal: "Has a reading goal this year",
	contributedDocuments: "Has shared a document",
	hasBio: "Has a bio",
	hasAvatar: "Has a profile photo",
} as const satisfies FieldLabels<PeopleActivityFilter>;

export const peopleStatusLabels = {
	active: "Active",
	warned: "Warned",
	banned: "Banned",
} as const;

export const PEOPLE_PAGE_SIZE = 12;

export const peopleListingSearchParams = {
	search: searchParser.withOptions({ shallow: true, throttleMs: 400 }),
	sortBy: parseAsStringLiteral(PEOPLE_SORT_FIELDS).withDefault("xp"),
	sortDirection: sortDirectionParser.withDefault("desc"),
	isAdmin: booleanFilterParser,
	statuses: parseAsArrayOf(parseAsStringLiteral(PEOPLE_STATUSES)),
	xpLevels: parseAsArrayOf(parseAsString),
	rpLevels: parseAsArrayOf(parseAsString),
	rangeMin: rangeMinParser,
	rangeMax: rangeMaxParser,
	genres: parseAsArrayOf(parseAsString),
	location: parseAsString,
	readBooks: parseAsArrayOf(parseAsString),
	minReads: parseAsInteger,
	minReviews: parseAsInteger,
	minSittings: parseAsInteger,
	minJoined: parseAsInteger,
	activity: parseAsArrayOf(parseAsStringLiteral(PEOPLE_ACTIVITY_FILTERS)),
};

export function usePeopleListingSearchParams() {
	return useQueryStates(peopleListingSearchParams);
}

export type PeopleListingSearchParams = ReturnType<
	typeof usePeopleListingSearchParams
>[0];

export function toPeopleListCallInput(
	params: PeopleListingSearchParams,
): Partial<GetPeopleListInput> {
	const activity = Object.fromEntries(
		(params.activity ?? []).map((key) => [key, true]),
	);

	return {
		limit: PEOPLE_PAGE_SIZE,
		...buildListCallInput({
			search: params.search,
			sortBy: params.sortBy,
			sortDirection: params.sortDirection,
			isAdmin: params.isAdmin,
			statuses: params.statuses,
			xpLevels: params.xpLevels,
			rpLevels: params.rpLevels,
			rangeMin: params.rangeMin,
			rangeMax: params.rangeMax,
			genres: params.genres,
			location: params.location,
			readBooks: params.readBooks,
			minReads: params.minReads,
			minReviews: params.minReviews,
			minSittings: params.minSittings,
			minJoined: params.minJoined,
		}),
		...activity,
	} as Partial<GetPeopleListInput>;
}

export function countPeopleSheetFilters(
	params: PeopleListingSearchParams,
): number {
	return (
		[
			params.isAdmin != null,
			Boolean(params.statuses?.length),
			Boolean(params.xpLevels?.length),
			Boolean(params.rpLevels?.length),
			params.rangeMin != null || params.rangeMax != null,
			Boolean(params.genres?.length),
			Boolean(params.location?.trim()),
			Boolean(params.readBooks?.length),
			params.minReads != null,
			params.minReviews != null,
			params.minSittings != null,
			params.minJoined != null,
		].filter(Boolean).length + (params.activity?.length ?? 0)
	);
}

export function clearPeopleSheetFilters(
	setParams: ReturnType<typeof usePeopleListingSearchParams>[1],
) {
	void setParams({
		isAdmin: null,
		statuses: null,
		xpLevels: null,
		rpLevels: null,
		rangeMin: null,
		rangeMax: null,
		genres: null,
		location: null,
		readBooks: null,
		minReads: null,
		minReviews: null,
		minSittings: null,
		minJoined: null,
		activity: null,
	});
}
