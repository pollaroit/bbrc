import { LOCALE_INTL_TAGS, type Locale } from "./locales";

/**
 * Country and language names in the words of a language, from the runtime's own `Intl` data
 * (no name tables to translate). `null` when the runtime has no name for the code, so callers
 * can fall back to something else.
 */

const regionNames = new Map<Locale, Intl.DisplayNames>();
const languageNames = new Map<Locale, Intl.DisplayNames>();

function displayNames(
	cache: Map<Locale, Intl.DisplayNames>,
	locale: Locale,
	type: "region" | "language",
) {
	let names = cache.get(locale);
	if (!names) {
		names = new Intl.DisplayNames([LOCALE_INTL_TAGS[locale]], {
			type,
			fallback: "none",
		});
		cache.set(locale, names);
	}
	return names;
}

/** "Azərbaycan" for `AZ` in Azerbaijani, "Azerbaijan" in English. */
export function regionName(locale: Locale, alpha2: string): string | null {
	try {
		return (
			displayNames(regionNames, locale, "region").of(alpha2.toUpperCase()) ??
			null
		);
	} catch {
		return null;
	}
}

/** ISO 639-2/B codes Open Library uses, mapped to the codes `Intl` knows. */
const BIBLIOGRAPHIC_TO_TERMINOLOGY: Record<string, string> = {
	fre: "fra",
	ger: "deu",
	chi: "zho",
	dut: "nld",
	gre: "ell",
	cze: "ces",
	rum: "ron",
	geo: "kat",
	arm: "hye",
	per: "fas",
};

/** Three-letter codes `Intl` does not know by themselves, as the two-letter codes it does. */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
	eng: "en",
	tur: "tr",
	rus: "ru",
	aze: "az",
	fra: "fr",
	deu: "de",
	spa: "es",
	ita: "it",
	por: "pt",
	ara: "ar",
	fas: "fa",
	zho: "zh",
	jpn: "ja",
	kor: "ko",
	hin: "hi",
	ukr: "uk",
	pol: "pl",
	nld: "nl",
	swe: "sv",
	nor: "no",
	dan: "da",
	fin: "fi",
	ell: "el",
	heb: "he",
	ces: "cs",
	hun: "hu",
	ron: "ro",
	bul: "bg",
	kat: "ka",
	hye: "hy",
	kaz: "kk",
	uzb: "uz",
	lat: "la",
};

/** "Türk dili" for `tur` in Azerbaijani, "Turkish" in English. */
export function languageName(locale: Locale, code: string): string | null {
	const lower = code.trim().toLowerCase();
	const terminology = BIBLIOGRAPHIC_TO_TERMINOLOGY[lower] ?? lower;
	const key = ALPHA3_TO_ALPHA2[terminology] ?? terminology;
	try {
		const name = displayNames(languageNames, locale, "language").of(key);
		if (!name || name.toLowerCase() === key) return null;
		// Azerbaijani gives the bare adjective in lower case ("türk"): a language is "Türk dili".
		if (locale === "az") {
			return `${name.charAt(0).toLocaleUpperCase("az-AZ")}${name.slice(1)} dili`;
		}
		return name;
	} catch {
		return null;
	}
}
