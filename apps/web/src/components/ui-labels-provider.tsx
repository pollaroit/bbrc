"use client";

import { LOCALE_INTL_TAGS, type Locale } from "@bbrc/i18n";
import { InfiniteScrollLabelsProvider } from "@bbrc/ui/components/infinite-scroll";
import {
	DateSelectorDefaultsProvider,
	DEFAULT_DATE_SELECTOR_I18N,
} from "@bbrc/ui/components/reui/date-selector";
import { UiLabelsProvider as BaseUiLabelsProvider } from "@bbrc/ui/components/ui-labels";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";

/** `Intl` names for the twelve months and the seven weekdays (Sunday first), in a language. */
function calendarNames(tag: string) {
	const month = (style: "long" | "short") => {
		const format = new Intl.DateTimeFormat(tag, { month: style });
		return Array.from({ length: 12 }, (_, index) =>
			format.format(new Date(2024, index, 1)),
		);
	};
	const weekday = (style: "long" | "short") => {
		const format = new Intl.DateTimeFormat(tag, { weekday: style });
		// 7 January 2024 is a Sunday.
		return Array.from({ length: 7 }, (_, index) =>
			format.format(new Date(2024, 0, 7 + index)),
		);
	};
	return {
		months: month("long"),
		monthsShort: month("short"),
		weekdays: weekday("long"),
		weekdaysShort: weekday("short"),
	};
}

/**
 * The packages/ui components are free of next-intl, so their built-in words (infinite lists,
 * the date selector) are translated once here and handed down through their providers.
 */
export function UiLabelsProvider({ children }: { children: ReactNode }) {
	const t = useTranslations("shell.ui");
	const locale = useLocale() as Locale;

	const dates = useMemo(
		() => ({
			...DEFAULT_DATE_SELECTOR_I18N,
			selectDate: t("dateSelector.selectDate"),
			apply: t("dateSelector.apply"),
			cancel: t("dateSelector.cancel"),
			clear: t("dateSelector.clear"),
			today: t("dateSelector.today"),
			filterTypes: {
				is: t("dateSelector.is"),
				before: t("dateSelector.before"),
				after: t("dateSelector.after"),
				between: t("dateSelector.between"),
			},
			periodTypes: {
				day: t("dateSelector.day"),
				month: t("dateSelector.month"),
				quarter: t("dateSelector.quarter"),
				halfYear: t("dateSelector.halfYear"),
				year: t("dateSelector.year"),
			},
			...calendarNames(LOCALE_INTL_TAGS[locale]),
			quarters: [1, 2, 3, 4].map((n) => t("dateSelector.quarterShort", { n })),
			halfYears: [1, 2].map((n) => t("dateSelector.halfYearShort", { n })),
			placeholder: t("dateSelector.placeholder"),
			rangePlaceholder: t("dateSelector.rangePlaceholder"),
		}),
		[t, locale],
	);

	const lists = useMemo(
		() => ({
			emptyTitle: t("infiniteScroll.emptyTitle"),
			errorTitle: t("infiniteScroll.errorTitle"),
			errorFallback: t("infiniteScroll.errorFallback"),
			retry: t("infiniteScroll.retry"),
		}),
		[t],
	);

	const words = useMemo(
		() => ({
			close: t("labels.close"),
			loading: t("labels.loading"),
			toggleSidebar: t("labels.toggleSidebar"),
			scrollToEnd: t("labels.scrollToEnd"),
			scrollToStart: t("labels.scrollToStart"),
		}),
		[t],
	);

	return (
		<BaseUiLabelsProvider labels={words}>
			<InfiniteScrollLabelsProvider labels={lists}>
				<DateSelectorDefaultsProvider i18n={dates} localeCode={locale}>
					{children}
				</DateSelectorDefaultsProvider>
			</InfiniteScrollLabelsProvider>
		</BaseUiLabelsProvider>
	);
}
