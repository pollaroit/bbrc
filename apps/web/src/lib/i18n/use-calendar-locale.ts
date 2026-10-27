"use client";

import type { Locale } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { az, enUS } from "react-day-picker/locale";

/** The day-picker locale (month and weekday names, week start) for each app language. */
const CALENDAR_LOCALES: Record<Locale, typeof enUS> = { en: enUS, az };

/** The `locale` prop of `<Calendar>` for the page language. */
export function useCalendarLocale() {
	return CALENDAR_LOCALES[useLocale() as Locale] ?? enUS;
}
