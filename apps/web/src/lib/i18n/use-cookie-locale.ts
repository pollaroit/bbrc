"use client";

import { LOCALE_COOKIE, type Locale, toLocale } from "@bbrc/i18n";
import { useEffect, useState } from "react";

/**
 * The language in the visitor's cookie, for pages outside the language segment (the offline
 * page): they are rendered once for everyone in English, then switch after the first render.
 */
export function useCookieLocale(): Locale {
	const [locale, setLocale] = useState<Locale>("en");
	useEffect(() => {
		const match = document.cookie
			.split("; ")
			.find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
		setLocale(toLocale(match?.slice(LOCALE_COOKIE.length + 1)));
	}, []);
	return locale;
}
