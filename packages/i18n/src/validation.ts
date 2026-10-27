import { createTranslator } from "use-intl/core";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import type { Messages } from "./messages";
import { validation as az } from "./messages/az/validation";
import { validation as en } from "./messages/en/validation";

// Only this namespace is imported (not the whole catalog), so the browser bundle stays small.
const catalogs: Record<Locale, Messages["validation"]> = { en, az };

type Leaves<T, P extends string = ""> = T extends string
	? P
	: {
			[K in keyof T & string]: Leaves<T[K], P extends "" ? K : `${P}.${K}`>;
		}[keyof T & string];

/** Every validation text, as `"area.key"` (checked by the compiler). */
export type ValidationKey = Leaves<Messages["validation"]>;

type Params = Record<string, string | number>;

let resolveLocale: () => Locale = () => DEFAULT_LOCALE;

/**
 * Says which language validation texts are written in. The web app points it at the language
 * of the page; the API points it at the language of the request being handled. Anything that
 * never sets it gets English.
 */
export function setValidationLocaleResolver(resolver: () => Locale): void {
	resolveLocale = resolver;
}

/** The text of one of our own validation messages in the current language. */
export function validationMessage(key: ValidationKey, params?: Params): string {
	const locale = resolveLocale();
	const translate = createTranslator({
		locale,
		messages: { validation: catalogs[locale] },
		namespace: "validation",
	}) as unknown as (key: string, values?: Params) => string;
	return translate(key, params);
}

/**
 * For zod: `.refine(check, { error: validationError("goal.selectAuthor") })`. The text is
 * resolved when the check fails, so it follows the language of that moment.
 */
export function validationError(key: ValidationKey, params?: Params) {
	return () => validationMessage(key, params);
}
