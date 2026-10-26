import { normalizeBookCountryCodes } from "@bbrc/shared";

/**
 * Nationalities are always MODERN countries. Sources (Wikidata citizenship, Wikipedia
 * descriptions, the AI) name the state an author lived under: the Russian Empire, the USSR,
 * the Qing dynasty. This turns those into today's country (RU, CN, ...), table driven.
 */

/** Old ISO 3166-1 codes that no longer exist, with the country they became. */
const RETIRED_CODES: Readonly<Record<string, string>> = {
	SU: "RU",
	DD: "DE",
	CS: "CZ",
	YU: "RS",
	ZR: "CD",
	BU: "MM",
	TP: "TL",
	UK: "GB",
};

/** Countries that were part of the Soviet Union (a Soviet citizen born there is from there). */
const FORMER_SOVIET = [
	"RU",
	"UA",
	"BY",
	"KZ",
	"GE",
	"AM",
	"AZ",
	"UZ",
	"TM",
	"TJ",
	"KG",
	"MD",
	"LT",
	"LV",
	"EE",
] as const;

type StateRule = {
	/** The modern country used when the birthplace does not decide it. */
	code: string;
	/**
	 * Countries the birthplace's modern country may replace `code` with:
	 * "any" (the empire spanned many countries today), or an explicit list.
	 */
	byBirthplace?: "any" | readonly string[];
};

const rule = (
	code: string,
	byBirthplace?: StateRule["byBirthplace"],
): StateRule => ({ code, byBirthplace });

/** Wikidata ids of states that no longer exist. Labels (below) are the safety net. */
const STATE_BY_QID: Readonly<Record<string, StateRule>> = {
	Q34266: rule("RU"), // Russian Empire
	Q186096: rule("RU"), // Tsardom of Russia
	Q15180: rule("RU", FORMER_SOVIET), // Soviet Union
	Q2184: rule("RU"), // Russian SFSR
	Q8733: rule("CN"), // Qing dynasty
	Q9903: rule("CN"), // Ming dynasty
	Q13426199: rule("CN"), // Republic of China (1912-1949)
	Q12548: rule("DE", "any"), // Holy Roman Empire
	Q28513: rule("AT", "any"), // Austria-Hungary
	Q131964: rule("AT", "any"), // Austrian Empire
	Q171150: rule("HU", "any"), // Kingdom of Hungary
	Q12560: rule("TR", "any"), // Ottoman Empire
	Q174193: rule("GB", ["IE"]), // United Kingdom of Great Britain and Ireland
	Q161885: rule("GB", ["IE"]), // Kingdom of Great Britain
	Q27306: rule("DE"), // Kingdom of Prussia
	Q38872: rule("DE"), // Prussia
	Q43287: rule("DE"), // German Empire
	Q7318: rule("DE"), // Nazi Germany
	Q41304: rule("DE"), // Weimar Republic
	Q16957: rule("DE"), // East Germany
	Q713750: rule("DE"), // West Germany
	Q33946: rule("CZ", ["CZ", "SK"]), // Czechoslovakia
	Q36704: rule("RS", "any"), // Socialist Federal Republic of Yugoslavia
	Q172579: rule("IT"), // Kingdom of Italy
	Q129286: rule("IN", ["IN", "PK", "BD", "LK", "MM", "NP"]), // British Raj
	Q2277: rule("IT", "any"), // Roman Empire
	Q1747689: rule("IT", "any"), // Ancient Rome
	Q11772: rule("GR"), // Ancient Greece
	Q12544: rule("GR", "any"), // Byzantine Empire
	Q11768: rule("EG"), // Ancient Egypt
	Q70972: rule("FR"), // Kingdom of France
	Q71084: rule("FR"), // First French Empire
};

const STATE_LABELS: ReadonlyArray<readonly [RegExp, StateRule]> = [
	[
		/\brussian (empire|sfsr|soviet federative)\b|\btsarist russia\b|\btsardom of russia\b|\bgrand duchy of moscow\b/i,
		rule("RU"),
	],
	[/\b(soviet union|ussr|u\.s\.s\.r)\b|\bsoviet\b/i, rule("RU", FORMER_SOVIET)],
	[
		/\bqing\b|\bmanchu\b|\bming dynasty\b|\bhan dynasty\b|\btang dynasty\b|\bsong dynasty\b|\byuan dynasty\b|\bimperial china\b|\bchina \(1912|\brepublic of china \(1912/i,
		rule("CN"),
	],
	[/\bholy roman empire\b/i, rule("DE", "any")],
	[
		/\baustria-hungary\b|\baustro-hungarian\b|\baustrian empire\b|\bhabsburg\b/i,
		rule("AT", "any"),
	],
	[/\bkingdom of hungary\b/i, rule("HU", "any")],
	[/\bottoman\b/i, rule("TR", "any")],
	[
		/\bkingdom of great britain\b|\bunited kingdom of great britain and ireland\b|\bbritish empire\b|\bkingdom of england\b|\bkingdom of scotland\b/i,
		rule("GB", ["IE"]),
	],
	[
		/\bprussia\b|\bprussian\b|\bgerman empire\b|\bnazi germany\b|\bweimar\b|\beast germany\b|\bwest germany\b|\bgerman democratic republic\b|\bconfederation of the rhine\b/i,
		rule("DE"),
	],
	[/\bczechoslovak/i, rule("CZ", ["CZ", "SK"])],
	[/\byugoslav/i, rule("RS", "any")],
	[
		/\bkingdom of italy\b|\bkingdom of sardinia\b|\bitalian states\b/i,
		rule("IT"),
	],
	[
		/\bbritish raj\b|\bbritish india\b|\bmughal\b|\bindian empire\b/i,
		rule("IN", ["IN", "PK", "BD", "LK", "MM", "NP"]),
	],
	[
		/\bcongress poland\b|\bkingdom of poland\b|\bpolish.lithuanian\b|\bpoland.lithuania\b/i,
		rule("PL"),
	],
	[
		/\bpersian empire\b|\bsafavid\b|\bqajar\b|\bachaemenid\b|\bpersia\b/i,
		rule("IR"),
	],
	[/\broman empire\b|\bancient rome\b|\broman republic\b/i, rule("IT", "any")],
	[/\bancient greece\b|\bbyzantine\b/i, rule("GR", "any")],
	[/\bancient egypt\b/i, rule("EG")],
	[/\bkingdom of france\b|\bfrench empire\b|\bfrench kingdom\b/i, rule("FR")],
	[/\bspanish empire\b|\bkingdom of spain\b|\bcrown of castile\b/i, rule("ES")],
	[/\bkingdom of portugal\b/i, rule("PT")],
	[/\bgrand duchy of finland\b/i, rule("FI")],
	[/\bdanish[- ]norwegian\b|\bkingdom of denmark\b/i, rule("DK")],
	[/\bswedish empire\b/i, rule("SE")],
	[
		/\bdutch republic\b|\bunited provinces\b|\bspanish netherlands\b/i,
		rule("NL"),
	],
	[/\bempire of japan\b|\btokugawa\b|\bedo period\b/i, rule("JP")],
	[/\bjoseon\b|\bkorean empire\b|\bgoryeo\b/i, rule("KR")],
];

/** The rule for a historical state, by Wikidata id first, then by its English label. */
export function historicalStateRule(
	qid: string | null | undefined,
	label: string | null | undefined,
): StateRule | null {
	if (qid && STATE_BY_QID[qid]) return STATE_BY_QID[qid] ?? null;
	if (label) {
		for (const [pattern, found] of STATE_LABELS) {
			if (pattern.test(label)) return found;
		}
	}
	return null;
}

/** Valid ISO codes only, retired ones mapped to their modern country, no repeats. */
export function toModernCountryCodes(codes: readonly string[]): string[] {
	const mapped = codes.map((raw) => {
		const upper = raw.trim().toUpperCase();
		return RETIRED_CODES[upper] ?? upper;
	});
	return normalizeBookCountryCodes(mapped);
}

/** True when a stored code is not a country of today (retired or not an ISO code at all). */
export function isOutdatedCountryCode(code: string): boolean {
	const upper = code.trim().toUpperCase();
	if (RETIRED_CODES[upper] && RETIRED_CODES[upper] !== upper) return true;
	return normalizeBookCountryCodes([upper]).length === 0;
}

export type NationalityPlace = {
	id: string | null;
	label: string | null;
	/** The ISO code when the entity is a current country. */
	countryCode: string | null;
};

/** A place that is, or sits in, a modern country (the birthplace's country). */
export type BirthCountry = {
	label: string | null;
	countryCode: string | null;
	/** The country entity's own id, to catch a historical one. */
	id?: string | null;
};

function ruleCode(
	stateRule: StateRule,
	birthCountryCode: string | null,
): string {
	const allowed = stateRule.byBirthplace;
	if (birthCountryCode && allowed) {
		if (allowed === "any") return birthCountryCode;
		if (allowed.includes(birthCountryCode)) return birthCountryCode;
	}
	return stateRule.code;
}

/**
 * Modern nationalities from what Wikidata holds: citizenships first (a historical state is
 * translated), then the country of the birthplace when no citizenship gave anything.
 */
export function nationalitiesFromWikidata(input: {
	citizenships: readonly NationalityPlace[];
	birthCountry: BirthCountry | null;
}): string[] {
	const birthCode = modernBirthCode(input.birthCountry);
	const out: string[] = [];
	for (const place of input.citizenships) {
		if (place.countryCode) {
			const [code] = toModernCountryCodes([place.countryCode]);
			if (code) {
				out.push(code);
				continue;
			}
		}
		const stateRule = historicalStateRule(place.id, place.label);
		if (stateRule) out.push(ruleCode(stateRule, birthCode));
	}
	if (out.length === 0 && birthCode) out.push(birthCode);
	return toModernCountryCodes(out);
}

function modernBirthCode(birth: BirthCountry | null): string | null {
	if (!birth) return null;
	if (birth.countryCode)
		return toModernCountryCodes([birth.countryCode])[0] ?? null;
	const stateRule = historicalStateRule(birth.id, birth.label);
	return stateRule ? stateRule.code : null;
}

// ── From text: "Russian novelist (1821–1881)" ───────────────────────────────

/** Demonyms (and a few state words) to the modern country, for short descriptions. */
const DEMONYMS: ReadonlyArray<readonly [string, string]> = [
	["russian", "RU"],
	["ukrainian", "UA"],
	["belarusian", "BY"],
	["polish", "PL"],
	["czech", "CZ"],
	["slovak", "SK"],
	["hungarian", "HU"],
	["romanian", "RO"],
	["bulgarian", "BG"],
	["serbian", "RS"],
	["croatian", "HR"],
	["slovene", "SI"],
	["slovenian", "SI"],
	["bosnian", "BA"],
	["macedonian", "MK"],
	["albanian", "AL"],
	["greek", "GR"],
	["turkish", "TR"],
	["georgian", "GE"],
	["armenian", "AM"],
	["azerbaijani", "AZ"],
	["kazakh", "KZ"],
	["uzbek", "UZ"],
	["kyrgyz", "KG"],
	["lithuanian", "LT"],
	["latvian", "LV"],
	["estonian", "EE"],
	["finnish", "FI"],
	["swedish", "SE"],
	["norwegian", "NO"],
	["danish", "DK"],
	["icelandic", "IS"],
	["german", "DE"],
	["austrian", "AT"],
	["swiss", "CH"],
	["dutch", "NL"],
	["belgian", "BE"],
	["luxembourgish", "LU"],
	["french", "FR"],
	["italian", "IT"],
	["spanish", "ES"],
	["portuguese", "PT"],
	["irish", "IE"],
	["scottish", "GB"],
	["welsh", "GB"],
	["english", "GB"],
	["british", "GB"],
	["american", "US"],
	["canadian", "CA"],
	["mexican", "MX"],
	["cuban", "CU"],
	["colombian", "CO"],
	["argentine", "AR"],
	["argentinian", "AR"],
	["chilean", "CL"],
	["peruvian", "PE"],
	["venezuelan", "VE"],
	["uruguayan", "UY"],
	["brazilian", "BR"],
	["australian", "AU"],
	["new zealand", "NZ"],
	["south african", "ZA"],
	["nigerian", "NG"],
	["kenyan", "KE"],
	["egyptian", "EG"],
	["moroccan", "MA"],
	["algerian", "DZ"],
	["tunisian", "TN"],
	["ethiopian", "ET"],
	["ghanaian", "GH"],
	["israeli", "IL"],
	["palestinian", "PS"],
	["lebanese", "LB"],
	["syrian", "SY"],
	["iraqi", "IQ"],
	["iranian", "IR"],
	["persian", "IR"],
	["saudi", "SA"],
	["afghan", "AF"],
	["pakistani", "PK"],
	["indian", "IN"],
	["bangladeshi", "BD"],
	["sri lankan", "LK"],
	["nepalese", "NP"],
	["chinese", "CN"],
	["taiwanese", "TW"],
	["japanese", "JP"],
	["korean", "KR"],
	["vietnamese", "VN"],
	["thai", "TH"],
	["indonesian", "ID"],
	["malaysian", "MY"],
	["filipino", "PH"],
	["mongolian", "MN"],
];

/**
 * Nationalities named by a short description ("Russian novelist", "Soviet-born Ukrainian
 * writer"), in order of appearance, at most 2. "Soviet" counts only when nothing else is named.
 */
export function nationalitiesFromDescription(
	description: string | null | undefined,
): string[] {
	if (!description) return [];
	const text = description.toLowerCase();
	const found: Array<{ at: number; code: string }> = [];
	for (const [word, code] of DEMONYMS) {
		const match = new RegExp(`(^|[^a-z])${word}(?![a-z])`).exec(text);
		if (match) found.push({ at: match.index, code });
	}
	found.sort((a, b) => a.at - b.at);
	const codes = [...new Set(found.map((item) => item.code))];
	if (codes.length > 0) return toModernCountryCodes(codes.slice(0, 2));
	const stateRule = historicalStateRule(null, description);
	return stateRule ? [stateRule.code] : [];
}
