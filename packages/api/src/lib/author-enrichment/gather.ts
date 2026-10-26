import { authorNameKey, looseAuthorKey } from "@bbrc/shared";
import {
	type BirthCountry,
	nationalitiesFromDescription,
	nationalitiesFromWikidata,
} from "./historical-states";
import {
	goodreadsAuthorUrl,
	type OpenLibraryAuthorRecord,
	type SourceFacts,
	truncateBio,
	type WikidataAuthorRecord,
	wikipediaTitleFromUrl,
} from "./parse";
import type { AuthorSources } from "./sources";

export type GatherInput = {
	name: string;
	openLibraryId?: string | null;
	wikidataId?: string | null;
	wikipediaUrl?: string | null;
	/** Look the name up on Open Library when no id is known (never for the backfill's exact mapping). */
	searchByName?: boolean;
};

export type Gathered = {
	openLibraryId: string | null;
	wikidataId: string | null;
	openLibrary: OpenLibraryAuthorRecord | null;
	wikidata: WikidataAuthorRecord | null;
	/** In priority order: Open Library, Wikidata, Wikipedia. */
	facts: SourceFacts[];
	/** Everything we hold as text, for the AI step (and nothing else may feed it). */
	sourceText: string;
	/** Other spellings Open Library knows. */
	alternateNames: string[];
};

/** The Open Library search hit that is clearly the same name, if any (strict: spelling variants only). */
export async function findOpenLibraryAuthorByName(
	sources: AuthorSources,
	name: string,
): Promise<string | null> {
	const hits = await sources.openLibrarySearchAuthors(name, 5);
	const strict = authorNameKey(name);
	const loose = looseAuthorKey(name);
	const same = hits
		.filter(
			(hit) =>
				authorNameKey(hit.name) === strict ||
				looseAuthorKey(hit.name) === loose,
		)
		.sort((a, b) => b.workCount - a.workCount);
	return same[0]?.olid ?? null;
}

/** Reads Open Library, Wikidata and Wikipedia for one author. Never throws for a missing record. */
export async function gatherAuthorFacts(
	sources: AuthorSources,
	input: GatherInput,
): Promise<Gathered> {
	let openLibraryId = input.openLibraryId ?? null;
	if (!openLibraryId && input.searchByName) {
		openLibraryId = await findOpenLibraryAuthorByName(sources, input.name);
	}

	const openLibrary = openLibraryId
		? await sources.openLibraryAuthor(openLibraryId)
		: null;

	const wikidataId = input.wikidataId ?? openLibrary?.wikidataId ?? null;
	const wikidata = wikidataId ? await sources.wikidataAuthor(wikidataId) : null;

	const facts: SourceFacts[] = [];
	const text: string[] = [];

	if (openLibrary) {
		facts.push({
			source: "openlibrary",
			values: {
				bio: openLibrary.bio ?? undefined,
				birth: openLibrary.birth,
				death: openLibrary.death,
				wikipediaUrl: openLibrary.wikipediaUrl ?? undefined,
				websiteUrl: openLibrary.websiteUrl ?? undefined,
				goodreadsUrl: openLibrary.goodreadsId
					? goodreadsAuthorUrl(openLibrary.goodreadsId)
					: undefined,
			},
		});
		if (openLibrary.bio) text.push(`Open Library bio: ${openLibrary.bio}`);
	}

	let wikipediaTarget = wikipediaTitleFromUrl(
		openLibrary?.wikipediaUrl ?? input.wikipediaUrl,
	);

	if (wikidata) {
		const placeIds = [
			wikidata.birthPlaceId,
			wikidata.deathPlaceId,
			...wikidata.citizenshipIds.slice(0, 5),
		].filter((id): id is string => id != null);
		const places = new Map<
			string,
			{
				label: string | null;
				countryCode: string | null;
				countryIds?: string[];
			}
		>();
		await Promise.all(
			[...new Set(placeIds)].map(async (id) => {
				places.set(id, await sources.wikidataPlace(id));
			}),
		);

		// The modern country of the birthplace: the place itself when it is a country, else the
		// country it sits in (P17). It decides what an empire or union citizenship means.
		let birthCountry: BirthCountry | null = null;
		const birthPlace = wikidata.birthPlaceId
			? places.get(wikidata.birthPlaceId)
			: undefined;
		if (birthPlace) {
			if (birthPlace.countryCode) {
				birthCountry = {
					label: birthPlace.label,
					countryCode: birthPlace.countryCode,
					id: wikidata.birthPlaceId,
				};
			} else {
				const countryIds = (birthPlace.countryIds ?? []).slice(0, 3);
				const countries = await Promise.all(
					countryIds.map(async (id) => ({
						id,
						...(await sources.wikidataPlace(id)),
					})),
				);
				const modern = countries.find((country) => country.countryCode);
				const first = modern ?? countries[0];
				if (first) {
					birthCountry = {
						label: first.label,
						countryCode: first.countryCode,
						id: first.id,
					};
				}
			}
		}

		let nationalities = nationalitiesFromWikidata({
			citizenships: wikidata.citizenshipIds.slice(0, 5).map((id) => ({
				id,
				label: places.get(id)?.label ?? null,
				countryCode: places.get(id)?.countryCode ?? null,
			})),
			birthCountry,
		});
		// Nothing structured: the short description ("Russian novelist") still names the country.
		if (nationalities.length === 0) {
			nationalities = nationalitiesFromDescription(wikidata.description);
		}

		const wikidataPageTitle = wikidata.wikipediaTitle;
		facts.push({
			source: "wikidata",
			values: {
				birth: wikidata.birth,
				death: wikidata.death,
				birthPlace: wikidata.birthPlaceId
					? (places.get(wikidata.birthPlaceId)?.label ?? undefined)
					: undefined,
				deathPlace: wikidata.deathPlaceId
					? (places.get(wikidata.deathPlaceId)?.label ?? undefined)
					: undefined,
				nationalities,
				gender: wikidata.gender ?? undefined,
				websiteUrl: wikidata.websiteUrl ?? undefined,
				wikipediaUrl: wikidataPageTitle
					? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikidataPageTitle.replace(/ /g, "_"))}`
					: undefined,
			},
		});
		if (wikidata.description) {
			text.push(`Wikidata description: ${wikidata.description}`);
		}
		if (wikidataPageTitle) {
			wikipediaTarget = { host: "en.wikipedia.org", title: wikidataPageTitle };
		}
	}

	if (wikipediaTarget) {
		const summary = await sources.wikipediaSummary(
			wikipediaTarget.host,
			wikipediaTarget.title,
		);
		if (summary) {
			facts.push({
				source: "wikipedia",
				values: {
					bio: truncateBio(summary.extract),
					wikipediaUrl: summary.pageUrl ?? undefined,
				},
			});
			text.push(`Wikipedia summary: ${summary.extract}`);
			if (summary.description) {
				text.push(`Wikipedia short description: ${summary.description}`);
				const fromDescription = nationalitiesFromDescription(
					summary.description,
				);
				const wikidataFact = facts.find((fact) => fact.source === "wikidata");
				const known =
					wikidataFact?.values.nationalities &&
					wikidataFact.values.nationalities.length > 0;
				if (fromDescription.length > 0 && !known) {
					const wikipediaFact = facts[facts.length - 1];
					if (wikipediaFact) {
						wikipediaFact.values.nationalities = fromDescription;
					}
				}
			}
		}
	}

	return {
		openLibraryId: openLibrary?.olid ?? openLibraryId,
		wikidataId,
		openLibrary,
		wikidata,
		facts,
		sourceText: text.join("\n\n"),
		alternateNames: openLibrary?.alternateNames ?? [],
	};
}
