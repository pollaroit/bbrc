import { createFormatters, type Formatters, toLocale } from "@bbrc/i18n";
import { useLocale } from "next-intl";

/**
 * Numbers, dates and times in the language of the page: `const f = useFormatters();
 * f.rating(4.5)` gives "4,5" in Azerbaijani. Works in client components (including their
 * first render on the server, so the two always agree) and in non-async server components.
 */
export function useFormatters(): Formatters {
	return createFormatters(toLocale(useLocale()));
}
