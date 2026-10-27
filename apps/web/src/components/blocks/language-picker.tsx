"use client";

import { LOCALE_NATIVE_NAMES, LOCALES, type Locale } from "@bbrc/i18n";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChangeLanguage } from "@/lib/i18n/use-change-language";
import { cn } from "@/lib/utils";

/**
 * The languages as large cards, each named in its own words. The current one is filled and
 * marked, so the state is clear without reading anything.
 */
export function LanguagePicker({ className }: { className?: string }) {
	const t = useTranslations("language");
	const { current, change, isSaving } = useChangeLanguage();

	return (
		<fieldset className={cn("flex flex-col gap-3", className)}>
			<legend className="sr-only">{t("title")}</legend>
			<div className="grid gap-2 sm:grid-cols-2">
				{LOCALES.map((locale) => {
					const active = locale === current;
					return (
						<button
							key={locale}
							type="button"
							aria-pressed={active}
							disabled={isSaving}
							onClick={() => change(locale)}
							lang={locale}
							className={cn(
								"flex min-h-16 items-center justify-between gap-3 border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:opacity-60",
								active
									? "border-foreground bg-foreground text-background"
									: "border-border bg-card hover:border-foreground/40 hover:bg-muted/40",
							)}
						>
							<span className="flex flex-col">
								<span className="font-semibold text-base leading-tight">
									{LOCALE_NATIVE_NAMES[locale]}
								</span>
								<span
									className={cn(
										"text-2xs uppercase tracking-wide",
										active ? "text-background/70" : "text-muted-foreground",
									)}
								>
									{locale}
								</span>
							</span>
							{active ? (
								<span className="flex items-center gap-1.5 text-xs">
									<Check className="size-4" aria-hidden />
									<span className="sr-only">
										{t("current", { language: LOCALE_NATIVE_NAMES[locale] })}
									</span>
								</span>
							) : (
								<span className="sr-only">
									{t("switchTo", { language: LOCALE_NATIVE_NAMES[locale] })}
								</span>
							)}
						</button>
					);
				})}
			</div>
			<p className="text-muted-foreground text-sm leading-relaxed">
				{t("description")}
			</p>
		</fieldset>
	);
}

/** The language names for a menu row: the current one and a function to change it. */
export function useLanguageChoices(): {
	current: Locale;
	label: string;
	choices: { locale: Locale; name: string; active: boolean }[];
	change: (locale: Locale) => void;
} {
	const t = useTranslations("language");
	const { current, change } = useChangeLanguage();
	return {
		current,
		label: t("title"),
		choices: LOCALES.map((locale) => ({
			locale,
			name: LOCALE_NATIVE_NAMES[locale],
			active: locale === current,
		})),
		change,
	};
}
