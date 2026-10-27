import { DEFAULT_LOCALE, formatMonthYear, type Locale } from "@bbrc/i18n";

export function formatReadFinishedMonthField(
	readEndYear: number | null | undefined,
	readEndMonth: number | null | undefined,
	locale: Locale = DEFAULT_LOCALE,
): string {
	if (readEndYear == null || readEndMonth == null) {
		return "Finish month not set";
	}
	return formatMonthYear(locale, { year: readEndYear, month: readEndMonth });
}
