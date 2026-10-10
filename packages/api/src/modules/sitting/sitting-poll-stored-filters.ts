import { normalizeBookCountryCodes } from "@bbrc/shared";
import type { CreateSittingPollInput } from "./sitting.schema";

/** Poll row fields that define the wishlist draw pool (persisted on `poll`). */
export type StoredPollFilterFields = {
	minPages: number | null;
	maxPages: number | null;
	minPublishedIn: number | null;
	maxPublishedIn: number | null;
	minOpenLibraryRating: number | null;
	minReads: number | null;
	maxReads: number | null;
	filterCountries: string[];
	filterAuthorSlugs: string[];
};

export function storedPollFiltersToInput(
	stored: StoredPollFilterFields,
): CreateSittingPollInput {
	return {
		minPages: stored.minPages ?? undefined,
		maxPages: stored.maxPages ?? undefined,
		minPublishedIn: stored.minPublishedIn ?? undefined,
		maxPublishedIn: stored.maxPublishedIn ?? undefined,
		minOpenLibraryRating: stored.minOpenLibraryRating ?? undefined,
		minReads: stored.minReads ?? undefined,
		maxReads: stored.maxReads ?? undefined,
		countries:
			stored.filterCountries.length > 0 ? stored.filterCountries : undefined,
		authors:
			stored.filterAuthorSlugs.length > 0
				? stored.filterAuthorSlugs
				: undefined,
	};
}

export function createPollInputToStoredFilters(
	poll: CreateSittingPollInput,
): Omit<StoredPollFilterFields, never> {
	return {
		minPages: poll.minPages ?? null,
		maxPages: poll.maxPages ?? null,
		minPublishedIn: poll.minPublishedIn ?? null,
		maxPublishedIn: poll.maxPublishedIn ?? null,
		minOpenLibraryRating: poll.minOpenLibraryRating ?? null,
		minReads: poll.minReads ?? null,
		maxReads: poll.maxReads ?? null,
		filterCountries:
			poll.countries && poll.countries.length > 0
				? normalizeBookCountryCodes(poll.countries)
				: [],
		filterAuthorSlugs: poll.authors ?? [],
	};
}
