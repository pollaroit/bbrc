import { describe, expect, test } from "bun:test";
import { gatherAuthorFacts } from "./gather";
import type { AuthorSources } from "./sources";

const emptyDate = { year: null, month: null, day: null };

function sources(overrides: Partial<AuthorSources>): AuthorSources {
	return {
		openLibraryAuthor: async () => null,
		openLibrarySearchAuthors: async () => [],
		openLibraryWorkAuthorIds: async () => [],
		wikidataAuthor: async () => null,
		wikidataPlace: async () => ({ label: null, countryCode: null }),
		wikipediaSummary: async () => null,
		commonsPhoto: async () => null,
		...overrides,
	};
}

function nationalitiesOf(
	gathered: Awaited<ReturnType<typeof gatherAuthorFacts>>,
	source: string,
): string[] | undefined {
	return gathered.facts.find((fact) => fact.source === source)?.values
		.nationalities;
}

describe("gatherAuthorFacts nationalities", () => {
	test("Dostoevsky: citizenship Russian Empire becomes RU", async () => {
		const places: Record<
			string,
			{ label: string; countryCode: string | null; countryIds?: string[] }
		> = {
			Q34266: { label: "Russian Empire", countryCode: null },
			Q649: { label: "Moscow", countryCode: null, countryIds: ["Q159"] },
			Q159: { label: "Russia", countryCode: "RU" },
		};
		const gathered = await gatherAuthorFacts(
			sources({
				wikidataAuthor: async (id) => ({
					id,
					description: "Russian novelist",
					birth: emptyDate,
					death: emptyDate,
					birthPlaceId: "Q649",
					deathPlaceId: null,
					citizenshipIds: ["Q34266"],
					gender: "male",
					wikipediaTitle: null,
					imageFile: null,
					websiteUrl: null,
				}),
				wikidataPlace: async (id) =>
					places[id] ?? { label: null, countryCode: null },
			}),
			{ name: "Fyodor Dostoyevsky", wikidataId: "Q991" },
		);
		expect(nationalitiesOf(gathered, "wikidata")).toEqual(["RU"]);
	});

	test("no citizenship: the birthplace's country, then the short description", async () => {
		const base = {
			description: null,
			birth: emptyDate,
			death: emptyDate,
			deathPlaceId: null,
			citizenshipIds: [],
			gender: null,
			wikipediaTitle: null,
			imageFile: null,
			websiteUrl: null,
		};
		const fromBirthplace = await gatherAuthorFacts(
			sources({
				wikidataAuthor: async (id) => ({ ...base, id, birthPlaceId: "Q1085" }),
				wikidataPlace: async (id) =>
					id === "Q1085"
						? { label: "Prague", countryCode: null, countryIds: ["Q213"] }
						: { label: "Czech Republic", countryCode: "CZ" },
			}),
			{ name: "Franz Kafka", wikidataId: "Q905" },
		);
		expect(nationalitiesOf(fromBirthplace, "wikidata")).toEqual(["CZ"]);

		const fromDescription = await gatherAuthorFacts(
			sources({
				wikidataAuthor: async (id) => ({
					...base,
					id,
					description: "Soviet-born Ukrainian writer",
					birthPlaceId: null,
				}),
			}),
			{ name: "Someone", wikidataId: "Q1" },
		);
		expect(nationalitiesOf(fromDescription, "wikidata")).toEqual(["UA"]);
	});
});
