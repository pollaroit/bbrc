"use client";

import { createFormatters, type Formatters, toLocale } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { useMemo } from "react";

/**
 * Numbers, dates and times in the language of the page: `const f = useFormatters();
 * f.rating(4.5)` gives "4,5" in Azerbaijani. Works in client components, including their
 * first render on the server, so the two always agree.
 */
export function useFormatters(): Formatters {
	const locale = toLocale(useLocale());
	return useMemo(() => createFormatters(locale), [locale]);
}
