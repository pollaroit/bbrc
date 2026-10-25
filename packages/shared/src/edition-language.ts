/**
 * Language names for book editions. Open Library gives languages as keys like
 * `/languages/tur` (sometimes just `tur`), which must never reach the screen.
 */

const LANGUAGE_NAMES: Record<string, string> = {
	eng: "English",
	tur: "Turkish",
	rus: "Russian",
	aze: "Azerbaijani",
	fra: "French",
	fre: "French",
	deu: "German",
	ger: "German",
	spa: "Spanish",
	ita: "Italian",
	por: "Portuguese",
	ara: "Arabic",
	fas: "Persian",
	per: "Persian",
	zho: "Chinese",
	chi: "Chinese",
	jpn: "Japanese",
	kor: "Korean",
	hin: "Hindi",
	ukr: "Ukrainian",
	pol: "Polish",
	nld: "Dutch",
	dut: "Dutch",
	swe: "Swedish",
	nor: "Norwegian",
	dan: "Danish",
	fin: "Finnish",
	ell: "Greek",
	gre: "Greek",
	heb: "Hebrew",
	ces: "Czech",
	cze: "Czech",
	hun: "Hungarian",
	ron: "Romanian",
	rum: "Romanian",
	bul: "Bulgarian",
	kat: "Georgian",
	geo: "Georgian",
	hye: "Armenian",
	arm: "Armenian",
	kaz: "Kazakh",
	uzb: "Uzbek",
	lat: "Latin",
};

/** `/languages/tur`, `languages/tur` or `TUR` all become `tur`. */
export function normalizeLanguageCode(raw: string): string {
	return raw
		.trim()
		.replace(/^\/?languages\//i, "")
		.toLowerCase();
}

/** "Turkish" for `/languages/tur` or `tur`; the upper-case code when it is not known. */
export function formatEditionLanguage(raw: string | null | undefined): string {
	if (!raw) return "";
	const code = normalizeLanguageCode(raw);
	if (!code) return "";
	const known = LANGUAGE_NAMES[code];
	if (known) return known;
	if (/^[a-z]{2,3}$/.test(code)) {
		try {
			const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
			if (name && name.toLowerCase() !== code) return name;
		} catch {
			// Fall through to the code.
		}
	}
	return code.toUpperCase();
}

/**
 * Cleans a stored edition label like "Penguin · 2003 · /languages/tur" (or a
 * bare "tur" segment) into "Penguin · 2003 · Turkish".
 */
export function cleanEditionLabel(label: string | null | undefined) {
	if (!label) return label ?? null;
	const cleaned = label
		.split(" · ")
		.map((part) => {
			const trimmed = part.trim();
			if (/^\/?languages\/[a-z]{2,3}$/i.test(trimmed)) {
				return formatEditionLanguage(trimmed);
			}
			// A bare, known 3-letter code on its own ("tur").
			if (/^[a-z]{3}$/.test(trimmed) && LANGUAGE_NAMES[trimmed]) {
				return LANGUAGE_NAMES[trimmed];
			}
			return part;
		})
		.join(" · ");
	return cleaned;
}
