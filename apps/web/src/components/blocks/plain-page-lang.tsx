"use client";

import { LOCALE_COOKIE, toLocale } from "@bbrc/i18n";
import { useEffect } from "react";

/**
 * Pages outside the language segment (the offline page, the feeds index) are rendered once for
 * everyone, in English. This sets `<html lang>` from the language cookie in the browser, so
 * assistive technology and translation tools see the visitor's language; their texts follow in PR 3.
 */
export function PlainPageLang() {
	useEffect(() => {
		const match = document.cookie
			.split("; ")
			.find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
		const value = match?.slice(LOCALE_COOKIE.length + 1);
		document.documentElement.lang = toLocale(value);
	}, []);
	return null;
}
