"use client";

import { type Locale, setValidationLocaleResolver } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { z } from "zod";
import { getPageLocale } from "@/lib/i18n/page-locale";

// In the browser our own validation texts follow the language of the page. (Not on the server:
// there the API sets its own resolver per request, and this module must not replace it.)
if (typeof window !== "undefined") {
	setValidationLocaleResolver(getPageLocale);
}

/** zod's built-in messages ("too short", "invalid email") in the language of the page. */
const zodLocales: Record<Locale, () => ReturnType<typeof z.locales.en>> = {
	en: z.locales.en,
	az: z.locales.az,
};

export function ValidationLocale() {
	const locale = useLocale() as Locale;
	useEffect(() => {
		z.config(zodLocales[locale]());
	}, [locale]);
	return null;
}
