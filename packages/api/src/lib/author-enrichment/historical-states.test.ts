import { describe, expect, test } from "bun:test";
import {
	historicalStateRule,
	isOutdatedCountryCode,
	nationalitiesFromDescription,
	nationalitiesFromWikidata,
	toModernCountryCodes,
} from "./historical-states";

describe("historical states", () => {
	test("by Wikidata id and by label", () => {
		expect(historicalStateRule("Q34266", null)?.code).toBe("RU");
		expect(historicalStateRule(null, "Russian Empire")?.code).toBe("RU");
		expect(historicalStateRule(null, "Soviet Union")?.code).toBe("RU");
		expect(historicalStateRule(null, "Qing dynasty")?.code).toBe("CN");
		expect(historicalStateRule(null, "Austria-Hungary")?.code).toBe("AT");
		expect(historicalStateRule(null, "Kingdom of Prussia")?.code).toBe("DE");
		expect(historicalStateRule(null, "France")).toBeNull();
	});

	test("retired codes", () => {
		expect(toModernCountryCodes(["SU", "ru", "UK", "ZZ", "YU", "RU"])).toEqual([
			"RU",
			"GB",
			"RS",
		]);
		expect(isOutdatedCountryCode("SU")).toBe(true);
		expect(isOutdatedCountryCode("RU")).toBe(false);
		expect(isOutdatedCountryCode("ZZ")).toBe(true);
	});
});

describe("nationalitiesFromWikidata", () => {
	test("Dostoevsky: a Russian Empire citizen is Russian", () => {
		expect(
			nationalitiesFromWikidata({
				citizenships: [
					{ id: "Q34266", label: "Russian Empire", countryCode: null },
				],
				birthCountry: { label: "Russia", countryCode: "RU" },
			}),
		).toEqual(["RU"]);
	});

	test("USSR: the birth republic wins, else Russia", () => {
		const ussr = [{ id: "Q15180", label: "Soviet Union", countryCode: null }];
		expect(
			nationalitiesFromWikidata({
				citizenships: ussr,
				birthCountry: { label: "Ukraine", countryCode: "UA" },
			}),
		).toEqual(["UA"]);
		expect(
			nationalitiesFromWikidata({ citizenships: ussr, birthCountry: null }),
		).toEqual(["RU"]);
		expect(
			nationalitiesFromWikidata({
				citizenships: ussr,
				birthCountry: { label: "France", countryCode: "FR" },
			}),
		).toEqual(["RU"]);
	});

	test("Qing dynasty is China", () => {
		expect(
			nationalitiesFromWikidata({
				citizenships: [{ id: null, label: "Qing dynasty", countryCode: null }],
				birthCountry: { label: "China", countryCode: "CN" },
			}),
		).toEqual(["CN"]);
	});

	test("Austria-Hungary: the modern country of the birthplace", () => {
		const citizenships = [
			{ id: "Q28513", label: "Austria-Hungary", countryCode: null },
		];
		expect(
			nationalitiesFromWikidata({
				citizenships,
				birthCountry: { label: "Czech Republic", countryCode: "CZ" },
			}),
		).toEqual(["CZ"]);
		expect(
			nationalitiesFromWikidata({ citizenships, birthCountry: null }),
		).toEqual(["AT"]);
	});

	test("UK of Great Britain and Ireland: born in Ireland is Irish", () => {
		const citizenships = [
			{
				id: "Q174193",
				label: "United Kingdom of Great Britain and Ireland",
				countryCode: null,
			},
		];
		expect(
			nationalitiesFromWikidata({
				citizenships,
				birthCountry: { label: "Ireland", countryCode: "IE" },
			}),
		).toEqual(["IE"]);
		expect(
			nationalitiesFromWikidata({
				citizenships,
				birthCountry: { label: "India", countryCode: "IN" },
			}),
		).toEqual(["GB"]);
	});

	test("current countries stay, repeats go, birthplace is the fallback", () => {
		expect(
			nationalitiesFromWikidata({
				citizenships: [
					{ id: "Q159", label: "Russia", countryCode: "RU" },
					{ id: "Q34266", label: "Russian Empire", countryCode: null },
				],
				birthCountry: null,
			}),
		).toEqual(["RU"]);
		expect(
			nationalitiesFromWikidata({
				citizenships: [],
				birthCountry: { label: "Prague", countryCode: "CZ" },
			}),
		).toEqual(["CZ"]);
		expect(
			nationalitiesFromWikidata({
				citizenships: [],
				birthCountry: {
					label: "Russian Empire",
					countryCode: null,
					id: "Q34266",
				},
			}),
		).toEqual(["RU"]);
	});
});

describe("nationalitiesFromDescription", () => {
	test("short descriptions", () => {
		expect(
			nationalitiesFromDescription("Russian novelist (1821–1881)"),
		).toEqual(["RU"]);
		expect(
			nationalitiesFromDescription("Soviet-born Ukrainian writer"),
		).toEqual(["UA"]);
		expect(nationalitiesFromDescription("Soviet writer")).toEqual(["RU"]);
		expect(nationalitiesFromDescription("British and Irish poet")).toEqual([
			"GB",
			"IE",
		]);
		expect(nationalitiesFromDescription("writer")).toEqual([]);
		expect(nationalitiesFromDescription(null)).toEqual([]);
	});
});
